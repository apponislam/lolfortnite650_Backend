import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { ISlot, SlotStatus } from "./slot.interface";
import { Slot } from "./slot.model";
import { ClientSession, Types } from "mongoose";
import { TeacherAvailability } from "../availability/availability.model";

const getAvailableSlots = async (teacherId: string, date?: Date) => {
    const now = new Date();
    const targetDate = date ? new Date(date) : now;

    // Start and end of day in UTC
    const startOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));

    const query: any = {
        teacher: teacherId,
        status: SlotStatus.AVAILABLE,
        date: { $gte: startOfDay, $lte: endOfDay },
        $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }],
    };

    const slots = await Slot.find(query).sort({ date: 1, startTime: 1 }).lean();

    // Filter past times if the requested date is today
    const filteredSlots = slots.filter((slot) => {
        const slotDateTime = new Date(slot.date);
        const [hours, minutes] = slot.startTime.split(":").map(Number);
        slotDateTime.setUTCHours(hours, minutes, 0, 0);

        return targetDate.toDateString() !== now.toDateString() || slotDateTime >= now;
    });

    return filteredSlots;
};

const getSlotStatus = async (
    slotId: string,
): Promise<
    ISlot & {
        isAvailable: boolean;
        isLocked: boolean;
        lockedBy: ISlot["lockedBy"] | null;
        lockExpiresAt: Date | null;
    }
> => {
    const slot = await Slot.findById(slotId).lean<ISlot>();

    if (!slot) {
        throw new ApiError(httpStatus.NOT_FOUND, "Slot not found");
    }

    const now = new Date();

    const lockedUntil = slot.lockedUntil ?? null;

    const isLocked = slot.status === SlotStatus.LOCKED && lockedUntil !== null && lockedUntil > now;

    const isAvailable = slot.status === SlotStatus.AVAILABLE || (slot.status === SlotStatus.LOCKED && lockedUntil !== null && lockedUntil < now);

    return {
        ...slot,
        isAvailable,
        isLocked,
        lockedBy: isLocked ? (slot.lockedBy ?? null) : null,
        lockExpiresAt: isLocked ? lockedUntil : null,
    };
};

const getTeacherSlots = async (teacherId: string, date?: string | Date): Promise<ISlot[]> => {
    const now = new Date();

    let targetDate: Date;
    if (!date) {
        targetDate = now;
    } else if (typeof date === "string") {
        targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid date");
        }
    } else {
        targetDate = date;
    }

    // UTC start/end of day
    const startOfDayUTC = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
    const endOfDayUTC = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));

    const query: any = {
        teacher: teacherId,
        date: { $gte: startOfDayUTC, $lte: endOfDayUTC },
        $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }],
    };

    const slots = await Slot.find(query).sort({ date: 1, startTime: 1 }).lean<ISlot[]>();

    return slots;
};

const updateSlotStatus = async (slotId: string, status: SlotStatus): Promise<ISlot> => {
    // Validate slotId
    if (!Types.ObjectId.isValid(slotId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid slot ID");
    }

    const slot = await Slot.findById(slotId);

    if (!slot) {
        throw new ApiError(httpStatus.NOT_FOUND, "Slot not found");
    }

    // Prevent any direct change to BOOKED
    if (status === SlotStatus.BOOKED) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Slots cannot be marked as booked directly. Use the booking flow.");
    }

    // Prevent changing already booked slot
    if (slot.status === SlotStatus.BOOKED) {
        throw new ApiError(httpStatus.BAD_REQUEST, "This slot is already booked and cannot be changed.");
    }

    slot.status = status;
    await slot.save();

    return slot.toObject() as ISlot;
};

const cleanupExpiredLocksAndBookings = async (): Promise<void> => {
    const session: ClientSession = await Slot.startSession();
    session.startTransaction();

    try {
        const now = new Date();

        // 1️⃣ Release expired locks
        await Slot.updateMany(
            {
                status: SlotStatus.LOCKED,
                lockedUntil: { $lt: now },
            },
            {
                $set: {
                    status: SlotStatus.AVAILABLE,
                    lockedBy: null,
                    lockedUntil: null,
                },
                $inc: { version: 1 },
            },
            { session },
        );

        // 2️⃣ Expired pending bookings
        // const expiredBookings: IBooking[] = await Booking.find({
        //     status: BookingStatus.PENDING,
        //     expiresAt: { $lt: now },
        // }).session(session);

        // if (expiredBookings.length > 0) {
        //     const expiredSlotIds = expiredBookings.map((b) => b.slot);

        //     // Mark bookings as expired
        //     await Booking.updateMany({ _id: { $in: expiredBookings.map((b) => b._id) } }, { $set: { status: BookingStatus.EXPIRED } }, { session });

        //     // Release slots that were locked by expired bookings
        //     await Slot.updateMany(
        //         {
        //             _id: { $in: expiredSlotIds },
        //             status: SlotStatus.LOCKED,
        //         },
        //         {
        //             $set: {
        //                 status: SlotStatus.AVAILABLE,
        //                 lockedBy: null,
        //                 lockedUntil: null,
        //             },
        //             $inc: { version: 1 },
        //         },
        //         { session },
        //     );
        // }

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const generateSlotsForTeacher = async (teacherId: string, days: number = 1): Promise<{ generated: number; skipped: number }> => {
    const teacherAvailability = await TeacherAvailability.findOne({ teacher: teacherId });

    if (!teacherAvailability) {
        throw new Error("Teacher availability not found");
    }

    const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    let totalGenerated = 0;
    let totalSkipped = 0;

    for (let i = 1; i <= days; i++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + i);
        targetDate.setHours(0, 0, 0, 0);

        const dayOfWeek = DAYS_OF_WEEK[targetDate.getDay()];

        const dayAvailability = teacherAvailability.availability.find((a) => a.day === dayOfWeek);

        if (!dayAvailability || dayAvailability.slots.length === 0) continue;

        const slotsToCreate: ISlot[] = [];

        for (const slot of dayAvailability.slots) {
            const [startH, startM] = slot.startTime.split(":").map(Number);
            const [endH, endM] = slot.endTime.split(":").map(Number);

            if (startH * 60 + startM >= endH * 60 + endM) continue;

            const durationMinutes = endH * 60 + endM - (startH * 60 + startM);
            const hours = Math.ceil(durationMinutes / 60);

            slotsToCreate.push({
                teacher: new Types.ObjectId(teacherId),
                date: new Date(targetDate),
                startTime: slot.startTime,
                endTime: slot.endTime,
                hours,
                status: SlotStatus.AVAILABLE,
                lockedBy: null,
                lockedUntil: null,
                booking: null,
                version: 0,
            });
        }

        const bulkOps = slotsToCreate.map((slot) => ({
            updateOne: {
                filter: {
                    teacher: slot.teacher,
                    date: slot.date,
                    startTime: slot.startTime,
                },
                update: { $setOnInsert: slot },
                upsert: true,
            },
        }));

        if (bulkOps.length > 0) {
            const result = await Slot.bulkWrite(bulkOps);

            totalGenerated += result.upsertedCount;
            totalSkipped += slotsToCreate.length - result.upsertedCount;
        }
    }

    return {
        generated: totalGenerated,
        skipped: totalSkipped,
    };
};

export const slotServices = {
    getAvailableSlots,
    getSlotStatus,
    getTeacherSlots,
    updateSlotStatus,

    // jobs
    cleanupExpiredLocksAndBookings,
    generateSlotsForTeacher,
};
