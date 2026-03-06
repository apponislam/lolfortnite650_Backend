import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { paymentServices } from "./payment.services";
import ApiError from "../../../errors/ApiError";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
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

const webhook = catchAsync(async (req: Request, res: Response) => {
    console.log("Webhook received");

    let body = req.body;

    if (Buffer.isBuffer(req.body)) {
        try {
            body = JSON.parse(req.body.toString());
        } catch (error) {
            console.error("Failed to parse webhook body:", error);
            // Still return 200 to acknowledge receipt
            return sendResponse(res, {
                statusCode: httpStatus.OK,
                success: true,
                message: "Webhook acknowledged",
                data: { received: true },
            });
        }
    }

    try {
        const result = await paymentServices.handleWebhook(req.headers, body);

        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Webhook processed successfully",
            data: result,
        });
    } catch (error) {
        console.error("Error processing webhook:", error);
        // Always return 200 to prevent retries
        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Webhook acknowledged",
            data: { received: true },
        });
    }
});

const makeRefund = catchAsync(async (req: Request, res: Response) => {
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
