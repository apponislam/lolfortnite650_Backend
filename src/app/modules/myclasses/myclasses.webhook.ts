import { Request, Response } from "express";
import httpStatus from "http-status";
import crypto from "crypto";
import { MyClassModel } from "./myclasses.model";
import config from "../../config";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { completeOffer } from "../messages/messages.services";

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
 * Process MyClass Payment from Webhook Data
 */
const processMyClassPayment = async (payload: any) => {
    const data = payload.Data;
    if (!data) return null;

    const invoiceId = data.InvoiceId || data.Invoice?.Id;
    const transactionStatus = data.TransactionStatus || data.Transaction?.Status;
    const paymentId = data.PaymentId || data.Transaction?.PaymentId;

    if (!invoiceId || !transactionStatus) return null;

    // Find the record in MyClass
    const myClass = await MyClassModel.findOne({ invoiceId: invoiceId.toString() });

    if (!myClass) return null;

    if (transactionStatus === "SUCCESS") {
        myClass.status = "PAID";
        if (paymentId) myClass.paymentId = paymentId.toString();
        await myClass.save();

        // Trigger additional logic like completing the offer message
        if (myClass.classType === "HOURLY_CLASS" && myClass.messageId) {
            try {
                await completeOffer(myClass.messageId.toString());
            } catch (err) {
                console.error("Failed to complete offer after webhook success:", err);
            }
        }
    } else if (transactionStatus === "FAILED") {
        myClass.status = "FAILED";
        await myClass.save();
    }

    return myClass;
};

/**
 * MyFatoorah Webhook Controller for MyClasses
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
            return sendResponse(res, {
                statusCode: httpStatus.UNAUTHORIZED,
                success: false,
                message: "Invalid webhook signature",
                data: null,
            });
        }
    }

    // Process the payment
    const result = await processMyClassPayment(body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Webhook processed successfully",
        data: result,
    });
});

export const MyClassWebhookControllers = {
    handleMyFatoorahWebhook,
};
