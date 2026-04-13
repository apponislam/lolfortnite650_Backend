import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { classPaymentService } from "./classpayments.services";

const initiateClassPayment = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }

    const result = await classPaymentService.initiateClassPayment(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment initiated successfully",
        data: result,
    });
});

const initiateMobileClassPayment = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }

    const result = await classPaymentService.initiateMobileClassPayment(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Mobile payment initiated successfully",
        data: result,
    });
});

const verifyClassPayment = catchAsync(async (req: Request, res: Response) => {
    const { paymentId } = req.query;

    const result = await classPaymentService.verifyClassPayment(paymentId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment verified successfully",
        data: result,
    });
});

const getStudentClasses = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await classPaymentService.getStudentClasses(userId!, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Student classes retrieved successfully",
        data: result,
    });
});

const getTeacherClasses = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await classPaymentService.getTeacherClasses(userId!, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Teacher classes retrieved successfully",
        data: result,
    });
});

const getHourlyClassTeacherPayments = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await classPaymentService.getHourlyClassTeacherPayments(userId!, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Hourly class teacher payments retrieved successfully",
        data: result,
    });
});

const getHourlyClassStudentPayments = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await classPaymentService.getHourlyClassStudentPayments(userId!, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Hourly class student payments retrieved successfully",
        data: result,
    });
});

export const ClassPaymentControllers = {
    initiateClassPayment,
    initiateMobileClassPayment,
    verifyClassPayment,
    getStudentClasses,
    getTeacherClasses,
    getHourlyClassTeacherPayments,
    getHourlyClassStudentPayments,
};
