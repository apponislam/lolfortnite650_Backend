import { mongo, Types } from "mongoose";

export type WeekDay = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface IAvailabilitySlot {
    startTime: string;
    endTime: string;
}

export interface IDayAvailability {
    day: WeekDay;
    slots: IAvailabilitySlot[];
}

export interface ITeacherAvailability {
    teacher: Types.ObjectId;
    availability: IDayAvailability[];
}
