import { Types } from "mongoose";

// Slot status enum
export enum SlotStatus {
    AVAILABLE = "available",
    LOCKED = "locked",
    BOOKED = "booked",
    UNAVAILABLE = "unavailable",
}

// Slot interface with hours field
export interface ISlot {
    teacher: Types.ObjectId;
    date: Date;
    startTime: string;
    endTime: string;
    hours: number;
    status: SlotStatus;
    lockedBy?: Types.ObjectId | null;
    lockedUntil?: Date | null;
    booking?: Types.ObjectId | null;
    version: number;
}
