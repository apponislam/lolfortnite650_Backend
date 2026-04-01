import { Schema, model, Document } from "mongoose";
import { HourlyClass } from "./hourlyclass.interface";

export interface HourlyClassDocument extends HourlyClass, Document {}

const hourlyClassSchema = new Schema<HourlyClassDocument>(
    {
        subject: {
            type: String,
            required: [true, "Subject is required"],
            trim: true,
        },
        curriculum: {
            type: String,
            required: [true, "Curriculum is required"],
            trim: true,
        },
        language: {
            type: String,
            required: [true, "Language is required"],
            trim: true,
            default: "English",
        },
        pricePerHour: {
            type: Number,
            required: [true, "Price per hour is required"],
            min: [0, "Price per hour must be at least 0"],
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Tutor user ID is required"],
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Indexes
hourlyClassSchema.index({ createdBy: 1 });
hourlyClassSchema.index({ subject: 1 });
hourlyClassSchema.index({ status: 1 });

export const HourlyClassModel = model<HourlyClassDocument>("HourlyClass", hourlyClassSchema);
