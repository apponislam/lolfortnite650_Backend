import { Types } from "mongoose";

export interface ISlot {
    teacher: Types.ObjectId;

    date: Date;

    startTime: string;
    endTime: string;

    isBooked: boolean;

    booking?: string;
}
