import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { userServices } from "./user.services";

const getAllTeachers = catchAsync(async (req: Request, res: Response) => {
    const query = req.query;
    const result = await userServices.getAllTeachersWithStats(query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Teachers retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const updateTeacherStatus = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const result = await userServices.updateUserStatus(id as string, status);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Teacher status updated successfully",
        data: result,
    });
});

const getSingleUser = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await userServices.getSingleUser(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "User profile retrieved successfully",
        data: result,
    });
});

export const userControllers = {
    getAllTeachers,
    updateTeacherStatus,
    getSingleUser,
};
