import { model, Schema } from "mongoose";
import { ITeacherAvailability } from "./availability.interface";

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
