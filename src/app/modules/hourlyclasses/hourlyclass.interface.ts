import { Types } from "mongoose";

export type HourlyClassStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface HourlyClass {
    subject: string;
    curriculum: string;
    language: string;
    pricePerHour: number;
    description: string;
    status: HourlyClassStatus;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
