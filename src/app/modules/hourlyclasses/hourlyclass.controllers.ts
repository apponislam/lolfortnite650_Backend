import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { hourlyClassServices } from "./hourlyclass.services";

// Create or Update hourly class
const createOrUpdateHourlyClass = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const result = await hourlyClassServices.createOrUpdateHourlyClass(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Hourly class updated successfully",
        data: result,
    });
});

// Get all hourly classes
const getAllHourlyClasses = catchAsync(async (req: Request, res: Response) => {
    const result = await hourlyClassServices.getAllHourlyClasses(req.query, req.user);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Hourly classes retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

// Get single hourly class by ID
const getHourlyClassById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await hourlyClassServices.getHourlyClassById(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Hourly class retrieved successfully",
        data: result,
    });
});

// Get my hourly class
const getMyHourlyClass = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const result = await hourlyClassServices.getMyHourlyClass(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "My hourly class retrieved successfully",
        data: result,
    });
});

export const hourlyClassControllers = {
    createOrUpdateHourlyClass,
    getAllHourlyClasses,
    getHourlyClassById,
    getMyHourlyClass,
};
