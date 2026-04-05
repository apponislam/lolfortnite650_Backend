import { Types } from "mongoose";

export type ClassType = "GROUP" | "ONE_TO_ONE";
export type TutorGender = "MALE" | "FEMALE";
export type ClassStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
export type ClassRunningStatus = "RUNNING" | "COMPLETED";

export interface Class {
    subject: string;
    level?: string;
    language?: string;
    curriculum?: string;
    price: number;
    tutorGender?: TutorGender;
    maxStudents?: number;
    enrolledStudents?: number;
    whatsappGroupLink?: string;
    description?: string;
    youtubeVideoLink?: string;
    classType?: ClassType;
    runningStatus?: ClassRunningStatus;
    images: string[];
    status: ClassStatus;
    createdBy: Types.ObjectId;
}
