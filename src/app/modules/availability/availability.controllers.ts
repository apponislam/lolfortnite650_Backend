import { Request, Response } from "express";
import httpStatus from "http-status";
import { availabilityService } from "./availability.services";
import catchAsync from "../../../utils/catchAsync";
import ApiError from "../../../errors/ApiError";
import sendResponse from "../../../utils/sendResponse";

const setTeacherAvailability = catchAsync(async (req: Request, res: Response) => {
    const teacherId = req.user._id;
    const { availability } = req.body;

    if (!availability || !Array.isArray(availability)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Availability is required and must be an array");
    }

    const result = await availabilityService.setTeacherAvailability(teacherId, availability);

    sendResponse(res, {
        statusCode: result.isNew ? httpStatus.CREATED : httpStatus.OK,
        success: true,
        message: result.message,
        data: result.data || null,
    });
});

const getTeacherAvailability = catchAsync(async (req: Request, res: Response) => {
    const teacherId = req.user._id;

    const availability = await availabilityService.getTeacherAvailability(teacherId as string);

    if (!availability) {
        throw new ApiError(httpStatus.NOT_FOUND, "Teacher availability not found");
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Teacher availability retrieved successfully",
        data: availability,
    });
});

const updateTeacherAvailability = catchAsync(async (req: Request, res: Response) => {
    const teacherId = req.user._id;
    const { availability } = req.body;

    if (!availability || !Array.isArray(availability)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Availability must be an array");
    }

    const result = await availabilityService.updateTeacherAvailability(teacherId, availability);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Availability updated successfully",
        data: result,
    });
});

const deleteTeacherAvailability = catchAsync(async (req: Request, res: Response) => {
    const teacherId = req.user._id;

    await availabilityService.deleteTeacherAvailability(teacherId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Availability deleted successfully",
        data: null,
    });
});

export const availabilityController = {
    setTeacherAvailability,
    getTeacherAvailability,
    updateTeacherAvailability,
    deleteTeacherAvailability,
};
