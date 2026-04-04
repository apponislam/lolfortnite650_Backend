import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { withdrawServices } from "./withdraw.services";

const createWithdrawRequest = catchAsync(async (req: Request, res: Response) => {
    const { amount, bankDetailsId } = req.body;
    const teacherId = req.user._id;

    const result = await withdrawServices.createWithdrawRequest(teacherId, amount, bankDetailsId);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Withdrawal request created successfully",
        data: result,
    });
});

const getWithdrawRequests = catchAsync(async (req: Request, res: Response) => {
    const result = await withdrawServices.getWithdrawRequests(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Withdrawal requests retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const updateWithdrawStatus = catchAsync(async (req: Request, res: Response) => {
    const { withdrawId } = req.params;
    const { status, adminComment } = req.body;

    const result = await withdrawServices.updateWithdrawStatus(withdrawId as string, status, adminComment);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Withdrawal request status updated to ${status}`,
        data: result,
    });
});

const cancelWithdrawRequest = catchAsync(async (req: Request, res: Response) => {
    const { withdrawId } = req.params;
    const teacherId = req.user._id;

    const result = await withdrawServices.cancelWithdrawRequest(withdrawId as string, teacherId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Withdrawal request cancelled/rejected successfully",
        data: result,
    });
});

const getMyWithdrawRequests = catchAsync(async (req: Request, res: Response) => {
    const teacherId = req.user._id;
    const query = { ...req.query, teacherId };

    const result = await withdrawServices.getWithdrawRequests(query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Your withdrawal requests retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

export const withdrawControllers = {
    createWithdrawRequest,
    getWithdrawRequests,
    updateWithdrawStatus,
    cancelWithdrawRequest,
    getMyWithdrawRequests,
};
