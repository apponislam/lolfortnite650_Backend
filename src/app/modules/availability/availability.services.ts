import httpStatus from "http-status";
import { TeacherAvailability } from "./availability.model";
import { Slot } from "../slot/slot.model";
import { SlotStatus } from "../slot/slot.interface";
import { slotServices } from "../slot/slot.services";
import { hasOverlap } from "../../../utils/availability";
import ApiError from "../../../errors/ApiError";

const setTeacherAvailability = async (teacherId: string, availability: any[]): Promise<any> => {
    for (const day of availability) {
        const result = hasOverlap(day.slots);
        if (result.overlap) {
            // Detailed message including all overlapping slot pairs
            const detailMsg = result.details?.join(", ");
            throw new ApiError(httpStatus.BAD_REQUEST, `Overlapping availability detected for ${day.day}: ${detailMsg}`);
        }
    }

    const existing = await TeacherAvailability.findOne({ teacher: teacherId });

    if (existing) {
        existing.availability = availability;
        await existing.save();

        return {
            message: "Availability updated successfully",
            data: existing,
        };
    }

    const result = await TeacherAvailability.create({
        teacher: teacherId,
        availability,
    });

    await slotServices.generateSlotsForTeacher(teacherId, 30);

    return {
        message: "Availability set successfully",
        data: result,
    };
};

const getTeacherAvailability = async (teacherId: string): Promise<any> => {
    return await TeacherAvailability.findOne({ teacher: teacherId }).lean();
};

const deleteTeacherAvailability = async (teacherId: string) => {
    await TeacherAvailability.deleteOne({ teacher: teacherId });

    // optional: remove future slots
    await Slot.deleteMany({
        teacher: teacherId,
        status: { $in: [SlotStatus.AVAILABLE, SlotStatus.UNAVAILABLE] },
    });
};

export const availabilityService = {
    setTeacherAvailability,
    getTeacherAvailability,

    deleteTeacherAvailability,
};
