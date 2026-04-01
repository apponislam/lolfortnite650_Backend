import { Schema, model, Document } from "mongoose";
import { HourlyClass } from "./hourlyclass.interface";

export interface HourlyClassDocument extends HourlyClass, Document {}

const hourlyClassSchema = new Schema<HourlyClassDocument>(
    {
        subjects: {
            type: [String],
            required: [true, "Subjects are required"],
            validate: {
                validator: (v: string[]) => v.length > 0,
                message: "At least one subject is required",
            },
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
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Tutor user ID is required"],
            unique: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Indexes
hourlyClassSchema.index({ subjects: 1 });
hourlyClassSchema.index({ curriculum: 1 });
hourlyClassSchema.index({ language: 1 });
hourlyClassSchema.index({ pricePerHour: 1 });
hourlyClassSchema.index({ createdAt: -1 });

// Compound indexes for filtering and sorting
hourlyClassSchema.index({ subjects: 1, pricePerHour: 1 });
hourlyClassSchema.index({ curriculum: 1, pricePerHour: 1 });
hourlyClassSchema.index({ language: 1, pricePerHour: 1 });

// Text index for full-text search on description and subjects
hourlyClassSchema.index(
    {
        description: "text",
        subjects: "text",
    },
    {
        weights: {
            subjects: 10,
            description: 5,
        },
        name: "HourlyClassSearchIndex",
    },
);

export const HourlyClassModel = model<HourlyClassDocument>("HourlyClass", hourlyClassSchema);
