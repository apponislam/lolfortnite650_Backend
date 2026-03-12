import { Schema, model } from "mongoose";

const bookingSchema = new Schema(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        teacher: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        slot: {
            type: Schema.Types.ObjectId,
            ref: "Slot",
            required: true,
            unique: true,
        },

        date: {
            type: Date,
            required: true,
            index: true,
        },

        startTime: String,
        endTime: String,

        status: {
            type: String,
            enum: ["booked", "cancelled", "completed"],
            default: "booked",
            index: true,
        },
    },
    { timestamps: true },
);

/*
Prevent duplicate student-slot booking
*/
bookingSchema.index({
    student: 1,
    slot: 1,
});

/*
Fast teacher schedule query
*/
bookingSchema.index({
    teacher: 1,
    date: 1,
});

export const Booking = model("Booking", bookingSchema);
