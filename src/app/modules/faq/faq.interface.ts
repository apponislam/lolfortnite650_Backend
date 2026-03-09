import { Types } from "mongoose";

export enum FAQAudienceEnum {
    ALL = "all",
    STUDENT = "student",
    TEACHER = "teacher",
}

export interface IFAQ {
    _id?: string;

    question: string;
    answer: string;
    audience: FAQAudienceEnum;
    createdBy?: Types.ObjectId;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
