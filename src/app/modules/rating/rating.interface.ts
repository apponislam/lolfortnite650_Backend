import { Types } from "mongoose";

export interface Rating {
    tutor?: Types.ObjectId;
    class?: Types.ObjectId;
    student: Types.ObjectId;

    rating: number;
    review?: string;

    isAnonymous?: boolean;
    reply?: string;

    createdAt: Date;
    updatedAt: Date;
}
