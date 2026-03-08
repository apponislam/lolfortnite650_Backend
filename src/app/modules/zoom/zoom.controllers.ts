import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { ZoomService } from "./zoom.services";
import { IZoomMeetingCreate } from "./zoom.interface";
import crypto from "crypto";

const createMeeting = catchAsync(async (req: Request, res: Response) => {
    const meetingData: IZoomMeetingCreate = req.body;

    const result = await ZoomService.createMeeting(meetingData);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Meeting created successfully",
        data: result,
    });
});

const getMeetingRecordings = catchAsync(async (req: Request, res: Response) => {
    const meetingId = req.params.meetingId as string;

    const result = await ZoomService.getMeetingRecordings(meetingId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Recordings retrieved successfully",
        data: result,
    });
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
    const signature = req.headers["x-zm-signature"] as string;
    const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN!;

    // Verify webhook signature
    const message = `v0:${req.headers["x-zm-request-timestamp"]}:${JSON.stringify(req.body)}`;
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

    if (event === "recording.completed") {
        // Handle recording completed event
        console.log("Recording completed:", req.body.payload);
        // You can store the recording details in DB or send notification
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Webhook received",
        data: null,
    });
});

export const ZoomController = {
    createMeeting,
    getMeetingRecordings,
    handleWebhook,
};
