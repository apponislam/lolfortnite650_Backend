import { Request, Response } from "express";
import crypto from "crypto";
import httpStatus from "http-status";
import config from "../../config";
import { ZoomMeeting, ZoomRecording } from "./zoom.model";
import sendResponse from "../../../utils/sendResponse";

export const ZoomWebhook = async (req: Request, res: Response) => {
    try {
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

        const secretToken = config.zoom.webhook_secret!;

        // Signature verification
        const message = `v0:${timestamp}:${JSON.stringify(req.body)}`;

        const hash = crypto.createHmac("sha256", secretToken).update(message).digest("hex");

        const expectedSignature = `v0=${hash}`;

        if (signature !== expectedSignature) {
            return sendResponse(res, {
                statusCode: httpStatus.UNAUTHORIZED,
                success: false,
                message: "Invalid signature",
                data: null,
            });
        }

        const event = req.body.event;

        /**
         * Recording completed event
         */
        if (event === "recording.completed") {
            const recordingData = req.body.payload.object;

            const meeting = await ZoomMeeting.findOne({
                id: recordingData.id,
            });

            if (meeting) {
                await ZoomRecording.create({
                    ...recordingData,
                    meeting: meeting._id,
                });
            }
        }

        return sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Webhook received",
            data: null,
        });
    } catch (error) {
        return sendResponse(res, {
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            success: false,
            message: "Webhook processing failed",
            data: null,
        });
    }
};
