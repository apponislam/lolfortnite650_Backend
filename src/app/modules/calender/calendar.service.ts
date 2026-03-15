// import { Types } from "mongoose";
// import { TeacherAvailability, Slot, Booking } from "./calendar.model";
// import { IAvailabilitySlot, SlotStatus, BookingStatus } from "./calendar.interface";

// export class CalendarService {
//     private readonly DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
//     private readonly LOCK_DURATION_MINUTES = 15;

//     async setTeacherAvailability(teacherId: string, availability: any[]): Promise<any> {
//         // teacherId comes from auth, not from client
//         const existing = await TeacherAvailability.findOne({ teacher: teacherId });

//         if (existing) {
//             existing.availability = availability;
//             await existing.save();
//             return { message: "Availability updated successfully", isNew: false };
//         } else {
//             await TeacherAvailability.create({
//                 teacher: teacherId,
//                 availability,
//             });

//             // Generate slots immediately
//             await this.generateSlotsForTeacher(teacherId);

//             return { message: "Availability set successfully", isNew: true };
//         }
//     }

//     // ==================== SLOT GENERATION (AUTOMATED) ====================
//     async generateSlotsForTeacher(teacherId: string): Promise<{
//         generated: number;
//         skipped: number;
//     }> {
//         const teacherAvailability = await TeacherAvailability.findOne({ teacher: teacherId });
//         if (!teacherAvailability) {
//             throw new Error("Teacher availability not found");
//         }

//         const startDate = new Date();
//         startDate.setHours(0, 0, 0, 0);
//         const endDate = new Date();
//         endDate.setDate(endDate.getDate() + 30);
//         endDate.setHours(23, 59, 59, 999);

//         const slotsToCreate = [];
//         const currentDate = new Date(startDate);

//         while (currentDate <= endDate) {
//             const dayOfWeek = this.DAYS_OF_WEEK[currentDate.getDay()];
//             const dayAvailability = teacherAvailability.availability.find((a) => a.day === dayOfWeek);

//             if (dayAvailability && dayAvailability.slots.length > 0) {
//                 for (const slot of dayAvailability.slots) {
//                     if (!this.isValidTimeSlot(slot)) {
//                         console.warn(`Invalid time slot for teacher ${teacherId} on ${dayOfWeek}:`, slot);
//                         continue;
//                     }

//                     slotsToCreate.push({
//                         teacher: new Types.ObjectId(teacherId),
//                         date: new Date(currentDate),
//                         startTime: slot.startTime,
//                         endTime: slot.endTime,
//                         status: SlotStatus.AVAILABLE,
//                         lockedBy: null,
//                         lockedUntil: null,
//                         booking: null,
//                         version: 0,
//                     });
//                 }
//             }
//             currentDate.setDate(currentDate.getDate() + 1);
//         }

//         if (slotsToCreate.length === 0) {
//             return { generated: 0, skipped: 0 };
//         }

//         const bulkOps = slotsToCreate.map((slot) => ({
//             updateOne: {
//                 filter: {
//                     teacher: slot.teacher,
//                     date: slot.date,
//                     startTime: slot.startTime,
//                 },
//                 update: { $setOnInsert: slot },
//                 upsert: true,
//             },
//         }));

//         const result = await Slot.bulkWrite(bulkOps);
//         return {
//             generated: result.upsertedCount,
//             skipped: slotsToCreate.length - result.upsertedCount,
//         };
//     }

//     // ==================== USER ACTIONS (LOCK/UNLOCK) ====================

//     /**
//      * Student locks a slot before payment
//      */
//     async lockSlotForBooking(studentId: string, slotId: string): Promise<any> {
//         const session = await Slot.startSession();
//         session.startTransaction();

//         try {
//             const now = new Date();
//             const lockUntil = new Date(now.getTime() + this.LOCK_DURATION_MINUTES * 60000);

//             const slot = await Slot.findOneAndUpdate(
//                 {
//                     _id: slotId,
//                     status: SlotStatus.AVAILABLE,
//                     $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }],
//                 },
//                 {
//                     status: SlotStatus.LOCKED,
//                     lockedBy: new Types.ObjectId(studentId),
//                     lockedUntil: lockUntil,
//                     $inc: { version: 1 },
//                 },
//                 {
//                     new: true,
//                     session,
//                     runValidators: true,
//                 },
//             );

//             if (!slot) {
//                 throw new Error("Slot is not available for locking");
//             }

//             // Check if student has any conflicting pending/booked slots
//             const conflictingBooking = await Booking.findOne({
//                 student: studentId,
//                 date: slot.date,
//                 $or: [
//                     {
//                         startTime: { $lt: slot.endTime },
//                         endTime: { $gt: slot.startTime },
//                     },
//                 ],
//                 status: { $in: [BookingStatus.PENDING, BookingStatus.BOOKED] },
//             }).session(session);

//             if (conflictingBooking) {
//                 throw new Error("You already have a booking during this time");
//             }

//             await session.commitTransaction();

//             return {
//                 slot,
//                 lockExpiresAt: lockUntil,
//             };
//         } catch (error) {
//             await session.abortTransaction();
//             throw error;
//         } finally {
//             session.endSession();
//         }
//     }

//     /**
//      * Student releases a lock (if they cancel checkout)
//      */
//     async releaseSlotLock(studentId: string, slotId: string): Promise<void> {
//         const result = await Slot.findOneAndUpdate(
//             {
//                 _id: slotId,
//                 status: SlotStatus.LOCKED,
//                 lockedBy: new Types.ObjectId(studentId),
//             },
//             {
//                 status: SlotStatus.AVAILABLE,
//                 lockedBy: null,
//                 lockedUntil: null,
//                 $inc: { version: 1 },
//             },
//         );

//         if (!result) {
//             throw new Error("Lock not found or you don't have permission to release it");
//         }
//     }

//     // ==================== USER ACTIONS (BOOKING FLOW) ====================

//     /**
//      * Student creates a pending booking (before payment)
//      */
//     async createPendingBooking(studentId: string, slotId: string): Promise<any> {
//         const session = await Slot.startSession();
//         session.startTransaction();

//         try {
//             // First lock the slot
//             const lockResult = await this.lockSlotForBooking(studentId, slotId);

//             // Create pending booking
//             const booking = await Booking.create(
//                 [
//                     {
//                         student: new Types.ObjectId(studentId),
//                         teacher: lockResult.slot.teacher,
//                         slot: lockResult.slot._id,
//                         date: lockResult.slot.date,
//                         startTime: lockResult.slot.startTime,
//                         endTime: lockResult.slot.endTime,
//                         status: BookingStatus.PENDING,
//                         expiresAt: lockResult.lockExpiresAt,
//                     },
//                 ],
//                 { session },
//             );

//             await session.commitTransaction();

//             return {
//                 booking: booking[0],
//                 expiresAt: lockResult.lockExpiresAt,
//             };
//         } catch (error) {
//             await session.abortTransaction();
//             throw error;
//         } finally {
//             session.endSession();
//         }
//     }

//     /**
//      * Confirm booking after payment success
//      */
//     async confirmBooking(bookingId: string, paymentIntentId: string): Promise<any> {
//         const session = await Booking.startSession();
//         session.startTransaction();

//         try {
//             const booking = await Booking.findOneAndUpdate(
//                 {
//                     _id: bookingId,
//                     status: BookingStatus.PENDING,
//                 },
//                 {
//                     status: BookingStatus.BOOKED,
//                     paymentIntentId,
//                     $unset: { expiresAt: 1 },
//                 },
//                 { session, new: true },
//             );

//             if (!booking) {
//                 throw new Error("Pending booking not found");
//             }

//             await Slot.findOneAndUpdate(
//                 { _id: booking.slot },
//                 {
//                     status: SlotStatus.BOOKED,
//                     booking: booking._id,
//                     lockedBy: null,
//                     lockedUntil: null,
//                 },
//                 { session },
//             );

//             await session.commitTransaction();

//             return booking;
//         } catch (error) {
//             await session.abortTransaction();
//             throw error;
//         } finally {
//             session.endSession();
//         }
//     }

//     /**
//      * Student cancels their booking
//      */
//     async cancelBooking(bookingId: string, studentId: string): Promise<void> {
//         const session = await Booking.startSession();
//         session.startTransaction();

//         try {
//             const booking = await Booking.findOneAndUpdate(
//                 {
//                     _id: bookingId,
//                     student: studentId,
//                     status: { $in: [BookingStatus.PENDING, BookingStatus.BOOKED] },
//                 },
//                 { status: BookingStatus.CANCELLED },
//                 { session, new: true },
//             );

//             if (!booking) {
//                 throw new Error("Booking not found or cannot be cancelled");
//             }

//             await Slot.findOneAndUpdate(
//                 { _id: booking.slot },
//                 {
//                     status: SlotStatus.AVAILABLE,
//                     booking: null,
//                     lockedBy: null,
//                     lockedUntil: null,
//                     $inc: { version: 1 },
//                 },
//                 { session },
//             );

//             await session.commitTransaction();
//         } catch (error) {
//             await session.abortTransaction();
//             throw error;
//         } finally {
//             session.endSession();
//         }
//     }

//     // ==================== CLEANUP METHODS (AUTOMATED) ====================

//     async cleanupExpiredLocksAndBookings(): Promise<void> {
//         const session = await Slot.startSession();
//         session.startTransaction();

//         try {
//             const now = new Date();

//             // Release expired locks
//             await Slot.updateMany(
//                 {
//                     status: SlotStatus.LOCKED,
//                     lockedUntil: { $lt: now },
//                 },
//                 {
//                     status: SlotStatus.AVAILABLE,
//                     lockedBy: null,
//                     lockedUntil: null,
//                     $inc: { version: 1 },
//                 },
//                 { session },
//             );

//             // Handle expired pending bookings
//             const expiredBookings = await Booking.find({
//                 status: BookingStatus.PENDING,
//                 expiresAt: { $lt: now },
//             }).session(session);

//             if (expiredBookings.length > 0) {
//                 const expiredSlotIds = expiredBookings.map((b) => b.slot);

//                 await Booking.updateMany(
//                     {
//                         _id: { $in: expiredBookings.map((b) => b._id) },
//                     },
//                     { status: BookingStatus.EXPIRED },
//                     { session },
//                 );

//                 await Slot.updateMany(
//                     {
//                         _id: { $in: expiredSlotIds },
//                         status: SlotStatus.LOCKED,
//                     },
//                     {
//                         status: SlotStatus.AVAILABLE,
//                         lockedBy: null,
//                         lockedUntil: null,
//                         $inc: { version: 1 },
//                     },
//                     { session },
//                 );
//             }

//             await session.commitTransaction();
//         } catch (error) {
//             await session.abortTransaction();
//             throw error;
//         } finally {
//             session.endSession();
//         }
//     }

//     // ==================== QUERY METHODS ====================

//     async getAvailableSlots(teacherId: string, startDate?: Date, endDate?: Date) {
//         const now = new Date();

//         const query: any = {
//             teacher: teacherId,
//             status: SlotStatus.AVAILABLE,
//             $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }],
//         };

//         if (startDate || endDate) {
//             query.date = {};
//             if (startDate) query.date.$gte = startDate;
//             if (endDate) query.date.$lte = endDate;
//         } else {
//             query.date = { $gte: new Date() };
//         }

//         return Slot.find(query).sort({ date: 1, startTime: 1 }).lean();
//     }

//     async getStudentBookings(studentId: string, status?: string) {
//         const query: any = { student: studentId };
//         if (status) query.status = status;

//         return Booking.find(query).populate("teacher", "name email").populate("slot").sort({ date: -1, startTime: -1 }).lean();
//     }

//     async getTeacherSlots(teacherId: string, startDate?: Date, endDate?: Date) {
//         const query: any = { teacher: teacherId };

//         if (startDate || endDate) {
//             query.date = {};
//             if (startDate) query.date.$gte = startDate;
//             if (endDate) query.date.$lte = endDate;
//         }

//         return Slot.find(query).populate("booking").sort({ date: 1, startTime: 1 }).lean();
//     }

//     async getSlotStatus(slotId: string): Promise<any> {
//         const slot = await Slot.findById(slotId).lean();

//         if (!slot) {
//             throw new Error("Slot not found");
//         }

//         const now = new Date();
//         const isLocked = slot.status === SlotStatus.LOCKED && slot.lockedUntil && slot.lockedUntil > now;

//         return {
//             ...slot,
//             isAvailable: slot.status === SlotStatus.AVAILABLE || (slot.status === SlotStatus.LOCKED && slot.lockedUntil && slot.lockedUntil < now),
//             isLocked,
//             lockedBy: isLocked ? slot.lockedBy : null,
//             lockExpiresAt: isLocked ? slot.lockedUntil : null,
//         };
//     }

//     async getBookingById(bookingId: string): Promise<any> {
//         return await Booking.findById(bookingId).populate("student", "name email").populate("teacher", "name email").populate("slot").lean();
//     }

//     async getTeacherAvailability(teacherId: string): Promise<any> {
//         return await TeacherAvailability.findOne({ teacher: teacherId }).lean();
//     }

//     // ==================== HELPER METHODS ====================

//     private isValidTimeSlot(slot: IAvailabilitySlot): boolean {
//         const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

//         if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
//             return false;
//         }

//         const [startHour, startMin] = slot.startTime.split(":").map(Number);
//         const [endHour, endMin] = slot.endTime.split(":").map(Number);

//         const startMinutes = startHour * 60 + startMin;
//         const endMinutes = endHour * 60 + endMin;

//         return startMinutes < endMinutes;
//     }
// }
