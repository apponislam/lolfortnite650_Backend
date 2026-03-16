import { Types } from "mongoose";

export type ClassType = "GROUP" | "ONE_TO_ONE";
export type TutorGender = "MALE" | "FEMALE";
export type ClassStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export interface Class {
    subject: string;
    level?: string;
    language?: string;
    curriculum?: string;
    price: number;
    tutorGender?: TutorGender;
    maxStudents?: number;
    whatsappGroupLink?: string;
    description?: string;
    youtubeVideoLink?: string;
    classType: ClassType;
    thumbnailUrl?: string;
    status: ClassStatus;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
