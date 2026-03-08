import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { ZoomService } from "./zoom.services";
import { IZoomMeetingCreate } from "./zoom.interface";
import crypto from "crypto";
import { ZoomMeeting, ZoomRecording } from "./zoom.model";

const createMeeting = catchAsync(async (req: Request, res: Response) => {
    const meetingData: IZoomMeetingCreate = req.body;
    const userId = req.user._id;

    const result = await ZoomService.createMeeting(meetingData, userId);

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

// const handleWebhook = catchAsync(async (req: Request, res: Response) => {
//     const signature = req.headers["x-zm-signature"] as string;
//     const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN!;

//     // Verify webhook signature
//     const message = `v0:${req.headers["x-zm-request-timestamp"]}:${JSON.stringify(req.body)}`;
//     const hash = crypto.createHmac("sha256", secretToken).update(message).digest("hex");
//     const expectedSignature = `v0=${hash}`;

//     if (signature !== expectedSignature) {
//         return sendResponse(res, {
//             statusCode: httpStatus.UNAUTHORIZED,
//             success: false,
//             message: "Invalid signature",
//             data: null,
//         });
//     }

//     const event = req.body.event;

//     if (event === "recording.completed") {
//         // Handle recording completed event
//         const recordingData = req.body.payload.object;
//         console.log("Recording completed:", recordingData);

//         // Find the meeting in DB
//         const meeting = await ZoomMeeting.findOne({ id: recordingData.id });
//         if (meeting) {
//             // Save recording to DB
//             const recording = new ZoomRecording({
//                 ...recordingData,
//                 meeting: meeting._id,
//             });
//             await recording.save();
//         }
//     }

//     sendResponse(res, {
//         statusCode: httpStatus.OK,
//         success: true,
//         message: "Webhook received",
//         data: null,
//     });
// });

const getUserMeetings = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id;

    const result = await ZoomService.getUserMeetings(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Meetings retrieved successfully",
        data: result,
    });
});

const getUserRecordings = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id;

    const result = await ZoomService.getUserRecordings(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Recordings retrieved successfully",
        data: result,
    });
});

export const ZoomController = {
    createMeeting,
    getMeetingRecordings,
    // handleWebhook,
    getUserMeetings,
    getUserRecordings,
};
