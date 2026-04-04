import { Request, Response } from "express";
import httpStatus from "http-status";
import crypto from "crypto";
import { ClassPaymentModel } from "./classpayments.model";
import config from "../../config";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { completeOffer } from "../messages/messages.services";
import ApiError from "../../../errors/ApiError";
import { UserModel } from "../auth/auth.model";

const MF_WEBHOOK_SECRET = config.myfatoorah.webhook_secret;

/**
 * Verify MyFatoorah Webhook Signature
 */
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

/**
 * Process ClassPayment Payment from Webhook Data
 */
const processClassPayment = async (payload: any) => {
    const data = payload.Data;
    if (!data) return null;

    const invoiceId = data.InvoiceId || data.Invoice?.Id;
    const transactionStatus = data.TransactionStatus || data.Transaction?.Status;
    const paymentId = data.PaymentId || data.Transaction?.PaymentId;

    if (!invoiceId || !transactionStatus) return null;

    // Find the record in ClassPayment
    const classPayment = await ClassPaymentModel.findOne({ invoiceId: invoiceId.toString() });

    if (!classPayment) return null;

    if (transactionStatus === "SUCCESS") {
        classPayment.status = "PAID";
        if (paymentId) classPayment.paymentId = paymentId.toString();
        await classPayment.save();

        // Add balance to teacher
        await UserModel.findByIdAndUpdate(classPayment.teacher, {
            $inc: { balance: classPayment.amount },
        });

        // Trigger additional logic like completing the offer message
        if (classPayment.classType === "HOURLY_CLASS" && classPayment.messageId) {
            try {
                await completeOffer(classPayment.messageId.toString());
            } catch (err) {
                console.error("Failed to complete offer after webhook success:", err);
            }
        }
    } else if (transactionStatus === "FAILED") {
        classPayment.status = "FAILED";
        await classPayment.save();
    }

    return classPayment;
};

/**
 * MyFatoorah Webhook Controller for ClassPayments
 */
const handleMyFatoorahWebhook = catchAsync(async (req: Request, res: Response) => {
    let body = req.body;

    // Parse raw body if necessary (MyFatoorah sometimes sends raw buffer)
    if (Buffer.isBuffer(req.body)) {
        try {
            body = JSON.parse(req.body.toString());
        } catch (error) {
            return sendResponse(res, {
                statusCode: httpStatus.OK,
                success: true,
                message: "Webhook acknowledged (Parse Error)",
                data: { received: true },
            });
        }
    }

    const signature = req.headers["myfatoorah-signature"] as string;

    // Signature verification (Only in production or if secret is present)
    if (MF_WEBHOOK_SECRET && process.env.NODE_ENV === "production") {
        const isValid = verifySignature(signature, body);
        if (!isValid) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid webhook signature");
        }
    }

    // Process the payment
    const result = await processClassPayment(body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Webhook processed successfully",
        data: result,
    });
});

export const ClassPaymentWebhookControllers = {
    handleMyFatoorahWebhook,
};
