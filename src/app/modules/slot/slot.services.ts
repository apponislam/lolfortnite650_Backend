import { SlotStatus } from "./slot.interface";
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

export const slotServices = {
    getAvailableSlots,
};
