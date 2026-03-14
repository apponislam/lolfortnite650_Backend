import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { ISlot, SlotStatus } from "./slot.interface";
import { Slot } from "./slot.model";

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

export const slotServices = {
    getAvailableSlots,
    getSlotStatus,
};
