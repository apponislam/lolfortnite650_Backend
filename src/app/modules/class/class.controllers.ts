import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { classServices } from "./class.services";

export const createClass = catchAsync(async (req: Request, res: Response) => {
    console.log("main data", req.body.data);
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
    const result = await classServices.getClasses(req.query, req.user);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Classes retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

export const getMyClasses = catchAsync(async (req: Request, res: Response) => {
    const result = await classServices.getMyClasses(req.user._id, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "My classes retrieved successfully",
        data: result.data,
        meta: result.meta,
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

export const getMyClassById = catchAsync(async (req: Request, res: Response) => {
    const result = await classServices.getMyClassById(req.params.classId as string, req.user._id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "My class retrieved successfully",
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
    getMyClasses,
    getClassById,
    getMyClassById,
    updateClass,
    deleteClass,
    setStatus,
};
