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
    const { classPaymentId, paymentId } = req.query;

    // Use our internal classPaymentId if provided, otherwise fallback to paymentId (for webhooks/older flows)
    const idToVerify = (classPaymentId as string) || (paymentId as string);

    const result = await classPaymentService.verifyClassPayment(idToVerify);

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
        data: result.data,
        meta: result.meta,
    });
});

const getTeacherClasses = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await classPaymentService.getTeacherClasses(userId!, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Teacher classes retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getHourlyClassTeacherPayments = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await classPaymentService.getHourlyClassTeacherPayments(userId!, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Hourly class teacher payments retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getHourlyClassStudentPayments = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await classPaymentService.getHourlyClassStudentPayments(userId!, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Hourly class student payments retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getNormalClassTeacherPayments = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await classPaymentService.getNormalClassTeacherPayments(userId!, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Normal class teacher payments retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getNormalClassStudentPayments = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await classPaymentService.getNormalClassStudentPayments(userId!, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Normal class student payments retrieved successfully",
        data: result.data,
        meta: result.meta,
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
    getNormalClassTeacherPayments,
    getNormalClassStudentPayments,
};
