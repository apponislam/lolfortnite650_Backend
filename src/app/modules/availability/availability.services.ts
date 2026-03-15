import { TeacherAvailability } from "./availability.model";
import { Slot } from "../slot/slot.model";
import { SlotStatus } from "../slot/slot.interface";
import { slotServices } from "../slot/slot.services";

const setTeacherAvailability = async (teacherId: string, availability: any[]): Promise<any> => {
    const existing = await TeacherAvailability.findOne({ teacher: teacherId });

    if (existing) {
        existing.availability = availability;
        await existing.save();

        return {
            message: "Availability updated successfully",
            isNew: false,
        };
    }

    await TeacherAvailability.create({
        teacher: teacherId,
        availability,
    });

    await slotServices.generateSlotsForTeacher(teacherId, 30);

    return {
        message: "Availability set successfully",
        isNew: true,
    };
};

const getTeacherAvailability = async (teacherId: string): Promise<any> => {
    return await TeacherAvailability.findOne({ teacher: teacherId }).lean();
};

const updateTeacherAvailability = async (teacherId: string, availability: any[]) => {
    const existing = await TeacherAvailability.findOne({ teacher: teacherId });

    if (!existing) {
        throw new Error("Availability not found");
    }

    existing.availability = availability;
    await existing.save();

    return existing;
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
    updateTeacherAvailability,
    deleteTeacherAvailability,
};
