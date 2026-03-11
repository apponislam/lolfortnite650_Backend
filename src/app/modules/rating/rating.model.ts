import { Schema, model } from "mongoose";
import { Rating } from "./rating.interface";

const ratingSchema = new Schema<Rating>(
    {
        tutor: {
            type: Schema.Types.ObjectId,
            ref: "Tutor",
        },

        class: {
            type: Schema.Types.ObjectId,
            ref: "Class",
        },

        student: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Student ID is required"],
        },

        rating: {
            type: Number,
            required: [true, "Rating is required"],
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot exceed 5"],
        },

        review: {
            type: String,
            trim: true,
        },

        isAnonymous: {
            type: Boolean,
            default: false,
        },

        reply: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

ratingSchema.index({ tutor: 1, createdAt: -1 });
ratingSchema.index({ class: 1, createdAt: -1 });
ratingSchema.index({ student: 1, createdAt: -1 });
ratingSchema.index({ tutor: 1, rating: -1 });

export const RatingModel = model<Rating>("Rating", ratingSchema);
