import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { hourlyClassServices } from "./hourlyclass.services";

// Create new hourly class
const createHourlyClass = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const result = await hourlyClassServices.createHourlyClass(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Hourly class created successfully",
        data: result,
    });
});

// Get all hourly classes
const getAllHourlyClasses = catchAsync(async (req: Request, res: Response) => {
    const result = await hourlyClassServices.getAllHourlyClasses(req.query);

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

// Get my hourly classes
const getMyHourlyClasses = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const result = await hourlyClassServices.getMyHourlyClasses(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "My hourly classes retrieved successfully",
        data: result,
    });
});

// Update hourly class
const updateHourlyClass = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const { id } = req.params;
    const result = await hourlyClassServices.updateHourlyClass(userId, id as string, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Hourly class updated successfully",
        data: result,
    });
});

export const hourlyClassControllers = {
    createHourlyClass,
    getAllHourlyClasses,
    getHourlyClassById,
    getMyHourlyClasses,
    updateHourlyClass,
};
