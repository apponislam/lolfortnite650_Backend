// src/app/modules/payment/payment.webhook.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import crypto from "crypto";
import { PaymentModel } from "./payment.model";
import config from "../../config";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";

const MF_WEBHOOK_SECRET = config.myfatoorah.webhook_secret;

const verifySignature = (signature: string, data: any): boolean => {
    if (!MF_WEBHOOK_SECRET || !signature) return false;

    try {
        const keys = Object.keys(data).sort();
        const signatureString = keys
            .map((k) => {
                const value = data[k];
                if (value && typeof value === "object") {
                    return `${k}=${JSON.stringify(value)}`;
                }
                return `${k}=${value}`;
            })
            .join(",");

        const expectedSignature = crypto.createHmac("sha256", MF_WEBHOOK_SECRET).update(signatureString).digest("base64");

        return signature === expectedSignature;
    } catch (error) {
        console.error("Signature verification error:", error);
        return false;
    }
};

const processPayment = async (payload: any) => {
    const data = payload.Data;
    if (!data) return null;

    const invoiceId = data.Invoice?.Id;
    const transactionStatus = data.Transaction?.Status;
    const paymentId = data.Transaction?.PaymentId;
    const externalIdentifier = data.Invoice?.ExternalIdentifier;

    if (!invoiceId || !transactionStatus) return null;

    // Find payment
    const payment = await PaymentModel.findOne({
        $or: [{ invoiceId }, { _id: externalIdentifier }],
    });

    if (!payment) {
        // Try direct ID lookup
        try {
            const directPayment = await PaymentModel.findById(externalIdentifier);
            if (directPayment && transactionStatus === "SUCCESS") {
                directPayment.status = "PAID";
                if (paymentId) directPayment.paymentId = paymentId;
                await directPayment.save();
                return directPayment;
            }
        } catch (err) {
            // Ignore invalid ObjectId
        }
        return null;
    }

    if (transactionStatus === "SUCCESS") {
        payment.status = "PAID";
        if (paymentId) payment.paymentId = paymentId;
        await payment.save();
    } else if (transactionStatus === "FAILED") {
        payment.status = "FAILED";
        if (paymentId) payment.paymentId = paymentId;
        await payment.save();
    }

    return payment;
};

export const paymentWebhook = catchAsync(async (req: Request, res: Response) => {
    // Parse raw body
    let body = req.body;
    if (Buffer.isBuffer(req.body)) {
        try {
            body = JSON.parse(req.body.toString());
        } catch (error) {
            return sendResponse(res, {
                statusCode: httpStatus.OK,
                success: true,
                message: "Webhook acknowledged",
                data: { received: true },
            });
        }
    }

    const signature = req.headers["myfatoorah-signature"] as string;

    // Verify signature in production
    if (MF_WEBHOOK_SECRET && process.env.NODE_ENV === "production") {
        if (!signature || !verifySignature(signature, body.Data)) {
            return sendResponse(res, {
                statusCode: httpStatus.OK,
                success: true,
                message: "Webhook acknowledged",
                data: { received: true },
            });
        }
    }

    // Process payment
    await processPayment(body);

    // Always return 200
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Webhook processed successfully",
        data: { received: true },
    });
});
