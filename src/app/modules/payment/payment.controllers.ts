import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { paymentServices } from "./payment.services";

export const initiatePayment = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const { amount, currency, metadata } = req.body;

    const result = await paymentServices.initiatePayment(userId, amount, currency, metadata);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment initiated successfully",
        data: {
            paymentId: result._id,
            paymentUrl: result.paymentUrl,
        },
    });
});

export const webhook = catchAsync(async (req: Request, res: Response) => {
    const result = await paymentServices.handleWebhook(req.headers, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Webhook processed successfully",
        data: result,
    });
});

export const makeRefund = catchAsync(async (req: Request, res: Response) => {
    const { invoiceId, amount } = req.body;

    const result = await paymentServices.makeRefund(invoiceId, amount);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Refund processed successfully",
        data: result,
    });
});

export const paymentControllers = {
    initiatePayment,
    webhook,
    makeRefund,
};
