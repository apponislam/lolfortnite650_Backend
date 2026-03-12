import { Schema, model } from "mongoose";
import { ITeacherAvailability, ISlot, IBooking, SlotStatus, BookingStatus } from "./calendar.interface";

/* TeacherAvailability */
const availabilitySlotSchema = new Schema(
    {
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
    },
    { _id: false },
);

const dayAvailabilitySchema = new Schema(
    {
        day: {
            type: String,
            enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            required: true,
        },
        slots: [availabilitySlotSchema],
    },
    { _id: false },
);

const teacherAvailabilitySchema = new Schema(
    {
        teacher: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },
        availability: [dayAvailabilitySchema],
    },
    { timestamps: true },
);

export const TeacherAvailability = model<ITeacherAvailability>("TeacherAvailability", teacherAvailabilitySchema);

/* Slot */
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
    },
);

// Indexes
slotSchema.index({ teacher: 1, date: 1, startTime: 1 }, { unique: true });
slotSchema.index({ teacher: 1, date: 1, status: 1 });
slotSchema.index({ status: 1, lockedUntil: 1 });
slotSchema.index({ date: 1 }, { expireAfterSeconds: 0 }); // TTL index - auto deletes past slots

export const Slot = model<ISlot>("Slot", slotSchema);

/* Booking */
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
        startTime: {
            type: String,
            required: true,
        },
        endTime: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(BookingStatus),
            default: BookingStatus.PENDING,
            index: true,
        },
        expiresAt: {
            type: Date,
            default: () => new Date(+new Date() + 15 * 60 * 1000),
            index: { expires: 0 },
        },
        paymentIntentId: {
            type: String,
            sparse: true,
            index: true,
        },
        metadata: {
            type: Map,
            of: Schema.Types.Mixed,
            default: new Map(),
        },
    },
    { timestamps: true },
);

// Indexes
bookingSchema.index({ student: 1, status: 1, date: -1 });
bookingSchema.index({ teacher: 1, status: 1, date: -1 });
bookingSchema.index({ student: 1, slot: 1 });

export const Booking = model<IBooking>("Booking", bookingSchema);
