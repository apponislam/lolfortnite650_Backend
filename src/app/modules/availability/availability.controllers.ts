import { Request, Response } from "express";
import httpStatus from "http-status";
import { availabilityService } from "./availability.services";

const setTeacherAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const teacherId = req.user._id;
        const { availability } = req.body;

        if (!availability || !Array.isArray(availability)) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Availability is required and must be an array",
            });
            return;
        }

        const result = await availabilityService.setTeacherAvailability(teacherId, availability);

        res.status(result.isNew ? httpStatus.CREATED : httpStatus.OK).json({
            success: true,
            message: result.message,
            data: result.data || null,
        });
    } catch (error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error instanceof Error ? error.message : "Something went wrong",
        });
    }
};

export const availabilityController = {
    setTeacherAvailability,
};
