import mongoose, { Schema, Document } from "mongoose";
import { Class } from "./class.interface";

export interface ClassDocument extends Class, Document {}

const ClassSchema = new Schema<ClassDocument>(
    {
        subject: {
            type: String,
            required: [true, "Subject is required"],
            trim: true,
        },

        level: { type: String, trim: true },

        language: { type: String, trim: true },

        curriculum: { type: String, trim: true },

        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price cannot be negative"],
        },

        tutorGender: {
            type: String,
            enum: {
                values: ["MALE", "FEMALE"],
                message: "Tutor gender must be MALE or FEMALE",
            },
            required: [true, "Tutor gender is required"],
        },

        maxStudents: {
            type: Number,
            min: [1, "Max students must be at least 1"],
        },

        whatsappGroupLink: { type: String, trim: true },

        description: { type: String, trim: true },

        youtubeVideoLink: { type: String, trim: true },

        classType: {
            type: String,
            enum: {
                values: ["GROUP", "ONE_TO_ONE"],
                message: "Class type must be GROUP or ONE_TO_ONE",
            },
            required: [true, "Class type is required"],
        },

        thumbnailUrl: { type: String, trim: true },

        status: {
            type: String,
            enum: ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"],
            default: "DRAFT",
            required: true,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Creator user ID is required"],
        },
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
