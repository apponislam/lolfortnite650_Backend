import { Schema, model } from "mongoose";

const slotSchema = new Schema(
    {
        teacher: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        date: {
            type: Date,
            required: true,
            index: true,
        },

        startTime: {
            type: String,
            required: true,
        },

        endTime: {
            type: String,
            required: true,
        },

        isBooked: {
            type: Boolean,
            default: false,
            index: true,
        },

        booking: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            default: null,
        },
    },
    { timestamps: true },
);

/*
Prevent duplicate slots
*/
slotSchema.index(
    {
        teacher: 1,
        date: 1,
        startTime: 1,
    },
    { unique: true },
);

/*
Fast slot lookup for students
*/
slotSchema.index({
    teacher: 1,
    date: 1,
    isBooked: 1,
});

/*
TTL delete past slots
*/
slotSchema.index({ date: 1 }, { expireAfterSeconds: 0 });

export const Slot = model("Slot", slotSchema);
