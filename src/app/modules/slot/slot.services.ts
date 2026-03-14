import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { ISlot, SlotStatus } from "./slot.interface";
import { Slot } from "./slot.model";
import { ClientSession, Types } from "mongoose";
import { TeacherAvailability } from "../availability/availability.model";

const getAvailableSlots = async (teacherId: string, date: Date) => {
    if (!date) return [];

    const now = new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query: any = {
        teacher: teacherId,
        status: SlotStatus.AVAILABLE,
        date: { $gte: startOfDay, $lte: endOfDay },
        $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }],
    };

    const slots = await Slot.find(query).sort({ date: 1, startTime: 1 }).lean();

    // Filter out past times if the requested date is today
    const filteredSlots = slots.filter((slot) => {
        if (date.toDateString() !== now.toDateString()) return true;

        const slotDateTime = new Date(slot.date);
        const [hours, minutes] = slot.startTime.split(":").map(Number);
        slotDateTime.setHours(hours, minutes, 0, 0);

        return slotDateTime >= now; // only future slots
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

const getTeacherSlots = async (teacherId: string, date?: Date): Promise<ISlot[]> => {
    const targetDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const slots = await Slot.find({
        teacher: teacherId,
        date: { $gte: startOfDay, $lte: endOfDay },
    })
        .populate("booking")
        .sort({ startTime: 1 })
        .lean<ISlot[]>();

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

    // Prevent changing booked slot to unavailable
    if (slot.status === SlotStatus.BOOKED && status === SlotStatus.UNAVAILABLE) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Cannot mark a booked slot as unavailable");
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

const generateSlotsForTeacher = async (teacherId: string): Promise<{ generated: number; skipped: number }> => {
    const teacherAvailability = await TeacherAvailability.findOne({ teacher: teacherId });
    if (!teacherAvailability) {
        throw new Error("Teacher availability not found");
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    endDate.setHours(23, 59, 59, 999);

    const slotsToCreate: ISlot[] = [];
    const currentDate = new Date(startDate);

    const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    while (currentDate <= endDate) {
        const dayOfWeek = DAYS_OF_WEEK[currentDate.getDay()];
        const dayAvailability = teacherAvailability.availability.find((a) => a.day === dayOfWeek);

        if (dayAvailability && dayAvailability.slots.length > 0) {
            for (const slot of dayAvailability.slots) {
                const [startH, startM] = slot.startTime.split(":").map(Number);
                const [endH, endM] = slot.endTime.split(":").map(Number);

                if (startH * 60 + startM >= endH * 60 + endM) {
                    console.warn(`Invalid slot for teacher ${teacherId} on ${dayOfWeek}:`, slot);
                    continue;
                }

                const durationMinutes = endH * 60 + endM - (startH * 60 + startM);
                const hours = Math.ceil(durationMinutes / 60);

                slotsToCreate.push({
                    teacher: new Types.ObjectId(teacherId),
                    date: new Date(currentDate),
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
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (slotsToCreate.length === 0) return { generated: 0, skipped: 0 };

    const bulkOps = slotsToCreate.map((slot) => ({
        updateOne: {
            filter: { teacher: slot.teacher, date: slot.date, startTime: slot.startTime },
            update: { $setOnInsert: slot },
            upsert: true,
        },
    }));

    const result = await Slot.bulkWrite(bulkOps);
    return {
        generated: result.upsertedCount,
        skipped: slotsToCreate.length - result.upsertedCount,
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
