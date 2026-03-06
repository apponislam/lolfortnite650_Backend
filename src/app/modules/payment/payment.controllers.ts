import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { paymentServices } from "./payment.services";

export const paymentControllers = {
    initiatePayment: catchAsync(async (req: Request, res: Response) => {
        const userId = req.user._id;
        const { amount, currency, metadata } = req.body;

        const result = await paymentServices.initiatePayment(userId, amount, currency, metadata);

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: "Payment initiated successfully",
            data: {
                paymentId: result._id,
                paymentUrl: result.paymentUrl,
            },
        });
    }),

    webhook: catchAsync(async (req: Request, res: Response) => {
        // Myfatoorah Webhook Payload -> body
        const result = await paymentServices.handleWebhook(req.headers, req.body);

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: "Webhook processed completely",
            data: result,
        });
    }),
};
