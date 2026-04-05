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
            default: 1,
            min: [1, "Max students must be at least 1"],
        },

        enrolledStudents: {
            type: Number,
            default: 0,
            min: [0, "Enrolled students cannot be negative"],
        },

        whatsappGroupLink: { type: String, trim: true },

        description: { type: String, trim: true },

        youtubeVideoLink: {
            type: String,
            trim: true,
            validate: {
                validator: function (v: string) {
                    return !v || /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(v);
                },
                message: "Please enter a valid YouTube link",
            },
        },

        classType: {
            type: String,
            enum: {
                values: ["GROUP", "ONE_TO_ONE"],
                message: "Class type must be GROUP or ONE_TO_ONE",
            },
            // Removed required: true since it's auto-set
        },

        runningStatus: {
            type: String,
            enum: ["RUNNING", "COMPLETED"],
            default: "RUNNING",
        },

        // thumbnailUrl: { type: String, trim: true },
        images: {
            type: [String],
            required: [true, "At least one image is required"],
            validate: {
                validator: function (v: string[]) {
                    return v.length > 0;
                },
                message: "At least one image is required",
            },
        },

        status: {
            type: String,
            enum: ["DRAFT", "PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
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

// Auto-set classType based on maxStudents
ClassSchema.pre("save", async function () {
    const maxStudents = this.maxStudents || 1; // Default to 1 if not provided
    if (maxStudents === 1) {
        this.classType = "ONE_TO_ONE";
    } else if (maxStudents > 1) {
        this.classType = "GROUP";
    }
});

// Auto-set classType for updates
ClassSchema.pre(["findOneAndUpdate", "updateMany", "updateOne"], async function () {
    const update = this.getUpdate() as any;

    // Check for maxStudents in direct update or $set
    const maxStudents = update.maxStudents !== undefined ? update.maxStudents : update.$set && update.$set.maxStudents;

    if (maxStudents !== undefined) {
        const classType = maxStudents === 1 ? "ONE_TO_ONE" : "GROUP";

        if (update.$set) {
            update.$set.classType = classType;
        } else {
            update.classType = classType;
        }
    }
});

// Single field indexes for core filtering
ClassSchema.index({ status: 1 });
ClassSchema.index({ classType: 1 });
ClassSchema.index({ subject: 1 });
ClassSchema.index({ level: 1 });
ClassSchema.index({ language: 1 });
ClassSchema.index({ curriculum: 1 });
ClassSchema.index({ price: 1 });
ClassSchema.index({ tutorGender: 1 });
ClassSchema.index({ createdBy: 1 });
ClassSchema.index({ createdAt: -1 });

// Compound indexes for high-performance searching
ClassSchema.index({ status: 1, classType: 1 });
ClassSchema.index({ subject: 1, price: 1 });
ClassSchema.index({ level: 1, price: 1 });
ClassSchema.index({ curriculum: 1, price: 1 });
ClassSchema.index({ language: 1, price: 1 });
ClassSchema.index({ status: 1, createdAt: -1 });

// Full-text search index with relevance weights
ClassSchema.index(
    {
        subject: "text",
        description: "text",
    },
    {
        weights: {
            subject: 10,
            description: 5,
        },
        name: "ClassSearchIndex",
    },
);

export const ClassModel = mongoose.model<Class>("Class", ClassSchema);
