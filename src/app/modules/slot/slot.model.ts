import { Schema, model } from "mongoose";
import { ISlot, SlotStatus } from "./slot.interface";

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
        },
        startTime: {
            type: String,
            required: true,
        },
        endTime: {
            type: String,
            required: true,
        },
        hours: {
            type: Number,
            required: true,
            default: 1,
        },
        status: {
            type: String,
            enum: Object.values(SlotStatus),
            default: SlotStatus.AVAILABLE,
            index: true,
        },
        lockedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        lockedUntil: {
            type: Date,
            default: null,
            index: true,
        },
        booking: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            default: null,
        },
        version: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Indexes
slotSchema.index({ teacher: 1, date: 1, startTime: 1 }, { unique: true });
slotSchema.index({ teacher: 1, date: 1, status: 1 });
slotSchema.index({ status: 1, lockedUntil: 1 });
slotSchema.index(
    { date: 1 },
    {
        expireAfterSeconds: 0,
        partialFilterExpression: { status: { $in: [SlotStatus.AVAILABLE, SlotStatus.UNAVAILABLE] } },
    },
);

export const Slot = model<ISlot>("Slot", slotSchema);
