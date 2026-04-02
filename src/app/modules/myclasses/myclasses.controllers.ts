import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { myClassService } from "./myclasses.services";

const initiateClassPayment = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }

    const result = await myClassService.initiateClassPayment(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment initiated successfully",
        data: result,
    });
});

const verifyClassPayment = catchAsync(async (req: Request, res: Response) => {
    const { paymentId } = req.query;

    const result = await myClassService.verifyClassPayment(paymentId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment verified successfully",
        data: result,
    });
});

const getStudentClasses = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await myClassService.getStudentClasses(userId!, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Student classes retrieved successfully",
        data: result,
    });
});

const getTeacherClasses = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await myClassService.getTeacherClasses(userId!, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Teacher classes retrieved successfully",
        data: result,
    });
});

export const MyClassControllers = {
    initiateClassPayment,
    verifyClassPayment,
    getStudentClasses,
    getTeacherClasses,
};
