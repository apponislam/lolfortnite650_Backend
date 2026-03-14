import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import ApiError from "../../../errors/ApiError";
import { slotServices } from "./slot.services";

const getAvailableSlots = catchAsync(async (req: Request, res: Response) => {
    const { teacherId } = req.params;
    const { date } = req.query;

    if (!date) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Date is required");
    }

    const requestedDate = new Date(date as string);

    const slots = await slotServices.getAvailableSlots(teacherId as string, requestedDate);

    if (!slots || slots.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, "No available slots found for this date");
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Available slots retrieved successfully",
        data: slots,
    });
});

const getSlotStatus = catchAsync(async (req: Request, res: Response) => {
    const { slotId } = req.params;

    const result = await slotServices.getSlotStatus(slotId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Slot status retrieved successfully",
        data: result,
    });
});

export const slotControllers = {
    getAvailableSlots,
    getSlotStatus,
};
