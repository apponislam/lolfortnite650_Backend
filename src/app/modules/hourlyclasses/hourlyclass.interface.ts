import { Types } from "mongoose";

export interface HourlyClass {
    subjects: string[];
    curriculum: string;
    language: string;
    pricePerHour: number;
    description: string;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
