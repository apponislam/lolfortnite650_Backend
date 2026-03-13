import { Types } from "mongoose";
import { TeacherAvailability } from "./availability.model";
import { Slot } from "../slot/slot.model";
import { SlotStatus } from "../calender/calendar.interface";

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

    await generateSlotsForTeacher(teacherId);

    return {
        message: "Availability set successfully",
        isNew: true,
    };
};

const generateSlotsForTeacher = async (teacherId: string): Promise<{ generated: number; skipped: number }> => {
    const teacherAvailability = await TeacherAvailability.findOne({ teacher: teacherId });

    if (!teacherAvailability) {
        throw new Error("Teacher availability not found");
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    endDate.setHours(23, 59, 59, 999);

    const slotsToCreate: any[] = [];
    const currentDate = new Date(startDate);

    const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    while (currentDate <= endDate) {
        const dayOfWeek = DAYS_OF_WEEK[currentDate.getDay()];

        const dayAvailability = teacherAvailability.availability.find((a: any) => a.day === dayOfWeek);

        if (dayAvailability && dayAvailability.slots.length > 0) {
            for (const slot of dayAvailability.slots) {
                slotsToCreate.push({
                    teacher: new Types.ObjectId(teacherId),
                    date: new Date(currentDate),
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    status: SlotStatus.AVAILABLE,
                    lockedBy: null,
                    lockedUntil: null,
                    booking: null,
                    version: 0,
                });
            }
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (slotsToCreate.length === 0) {
        return { generated: 0, skipped: 0 };
    }

    const bulkOps = slotsToCreate.map((slot) => ({
        updateOne: {
            filter: {
                teacher: slot.teacher,
                date: slot.date,
                startTime: slot.startTime,
            },
            update: { $setOnInsert: slot },
            upsert: true,
        },
    }));

    const result = await Slot.bulkWrite(bulkOps);

    return {
        generated: result.upsertedCount,
        skipped: slotsToCreate.length - result.upsertedCount,
    };
};

const getTeacherAvailability = async (teacherId: string): Promise<any> => {
    return await TeacherAvailability.findOne({ teacher: teacherId }).lean();
};

export const availabilityService = {
    setTeacherAvailability,
    getTeacherAvailability,
};
