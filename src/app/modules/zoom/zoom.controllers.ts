import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { ZoomService } from "./zoom.services";

const createMeeting = catchAsync(async (req: Request, res: Response) => {
    const meetingData = req.body;
    const userId = req.user._id;

    const result = await ZoomService.createMeeting(meetingData, userId);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Meeting created successfully",
        data: result,
    });
});

const updateMeetingRecordings = catchAsync(async (req: Request, res: Response) => {
    const { meetingId } = req.params;

    const result = await ZoomService.updateMeetingRecordings(meetingId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Meeting recording details updated successfully",
        data: result,
    });
});

const getMyMeetings = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id;

    const result = await ZoomService.getMyMeetings(userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Meetings retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getMeetingDetails = catchAsync(async (req: Request, res: Response) => {
    const { meetingId } = req.params;

    const result = await ZoomService.getMeetingDetails(meetingId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Meeting details retrieved successfully",
        data: result,
    });
});

const getMeetingsByClass = catchAsync(async (req: Request, res: Response) => {
    const { classId } = req.params;

    const result = await ZoomService.getMeetingsByClass(classId as string, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Class meetings retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

export const ZoomController = {
    createMeeting,
    updateMeetingRecordings,
    getMyMeetings,
    getMeetingDetails,
    getMeetingsByClass,
};
