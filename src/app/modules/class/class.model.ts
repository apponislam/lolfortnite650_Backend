import mongoose, { Schema, Document } from "mongoose";
import { Class } from "./class.interface";

export interface ClassDocument extends Class, Document {}

const ClassSchema = new Schema<ClassDocument>(
    {
        subject: { type: String, required: true, trim: true },
        level: { type: String, trim: true },
        language: { type: String, trim: true },
        curriculum: { type: String, trim: true },
        price: { type: Number, required: true, min: 0 },
        tutorGender: { type: String, enum: ["MALE", "FEMALE", "ANY"], default: "ANY" },
        maxStudents: { type: Number, min: 1 },
        whatsappGroupLink: { type: String, trim: true },
        description: { type: String, trim: true },
        youtubeVideoLink: { type: String, trim: true },
        classType: { type: String, enum: ["GROUP", "ONE_TO_ONE"], required: true },
        thumbnailUrl: { type: String, trim: true },
        status: { type: String, enum: ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"], default: "DRAFT", required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

ClassSchema.index({ subject: "text", description: "text" });
ClassSchema.index({ status: 1 });
ClassSchema.index({ classType: 1 });

export const ClassModel = mongoose.model<Class>("Class", ClassSchema);
