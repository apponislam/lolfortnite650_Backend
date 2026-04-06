import { Request, Response } from "express";
import crypto from "crypto";
import httpStatus from "http-status";
import config from "../../config";
import { ZoomModel } from "./zoom.model";
import sendResponse from "../../../utils/sendResponse";

export const ZoomWebhook = async (req: Request, res: Response) => {
    try {
        // Since app.ts uses express.raw, req.body is a Buffer
        const rawBody = req.body.toString("utf-8");
        const body = JSON.parse(rawBody);
        const event = body.event;

        /**
         * 1. URL Validation (Required by Zoom when setting up webhook)
         */
        if (event === "endpoint.url_validation") {
            const plainToken = body.payload.plainToken;
            const hash = crypto.createHmac("sha256", config.zoom.webhook_secret!).update(plainToken).digest("hex");

            return res.status(httpStatus.OK).json({
                plainToken,
                encryptedToken: hash,
            });
        }

        /**
         * 2. Signature Verification (For security)
         */
        const signature = req.headers["x-zm-signature"] as string;
        const timestamp = req.headers["x-zm-request-timestamp"] as string;

        if (!signature || !timestamp) {
            return sendResponse(res, {
                statusCode: httpStatus.UNAUTHORIZED,
                success: false,
                message: "Missing webhook signature",
                data: null,
            });
        }

        // Use the raw body string for signature verification
        const message = `v0:${timestamp}:${rawBody}`;
        const hash = crypto.createHmac("sha256", config.zoom.webhook_secret!).update(message).digest("hex");

        const expectedSignature = `v0=${hash}`;

        if (signature !== expectedSignature) {
            return sendResponse(res, {
                statusCode: httpStatus.UNAUTHORIZED,
                success: false,
                message: "Invalid signature",
                data: null,
            });
        }

        /**
         * 3. Handle Events
         */
        if (event === "recording.completed") {
            const recordingData = body.payload.object;

            // Find the meeting in DB and update with recording details
            await ZoomModel.findOneAndUpdate(
                { meetingId: recordingData.id },
                {
                    $set: {
                        total_size: recordingData.total_size,
                        recording_count: recordingData.recording_count,
                        recording_files: recordingData.recording_files,
                    },
                },
            );
        }

        return sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Webhook processed",
            data: null,
        });
    } catch (error) {
        console.error("Zoom Webhook Error:", error);
        return sendResponse(res, {
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            success: false,
            message: "Webhook processing failed",
            data: null,
        });
    }
};
