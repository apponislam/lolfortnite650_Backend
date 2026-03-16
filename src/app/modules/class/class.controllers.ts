import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { classServices } from "./class.services";

export const createClass = catchAsync(async (req: Request, res: Response) => {
    // Parse JSON from "data" key
    const payload = JSON.parse(req.body.data);

    // Attach uploaded images
    if ((req as any).savedClassImages) {
        payload.images = (req as any).savedClassImages;
    }

    const result = await classServices.createClass(req.user._id, payload);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Class created successfully",
        data: result,
    });
});

export const getClasses = catchAsync(async (req: Request, res: Response) => {
    const result = await classServices.getClasses(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Classes retrieved successfully",
        data: result,
    });
});

export const getClassById = catchAsync(async (req: Request, res: Response) => {
    const result = await classServices.getClassById(req.params.classId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Class retrieved successfully",
        data: result,
    });
});

export const updateClass = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body.data ? JSON.parse(req.body.data) : {};
    if ((req as any).savedClassImages) {
        payload.images = (req as any).savedClassImages;
    }

    const result = await classServices.updateClass(req.params.classId as string, req.user._id, payload);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Class updated successfully",
        data: result,
    });
});

export const deleteClass = catchAsync(async (req: Request, res: Response) => {
    await classServices.deleteClass(req.params.classId as string, req.user._id, req.user.role);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Class deleted successfully",
        data: null,
    });
});

export const submitForReview = catchAsync(async (req: Request, res: Response) => {
    const result = await classServices.submitForReview(req.params.classId as string, req.user._id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Class submitted for review",
        data: result,
    });
});

export const setStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await classServices.setClassStatus(req.params.classId as string, req.body.status);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Class status updated successfully",
        data: result,
    });
});

export const classControllers = {
    createClass,
    getClasses,
    getClassById,
    updateClass,
    deleteClass,
    submitForReview,
    setStatus,
};
