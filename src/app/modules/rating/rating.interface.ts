import { Types } from "mongoose";

export interface Rating {
    tutor: Types.ObjectId;
    class?: Types.ObjectId;
    student: Types.ObjectId;

    rating: number;
    review?: string;

    reply?: string;

    isDeleted: boolean;

    createdAt: Date;
    updatedAt: Date;
}
