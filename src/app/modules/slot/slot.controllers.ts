import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import ApiError from "../../../errors/ApiError";
import { slotServices } from "./slot.services";
import { SlotStatus } from "./slot.interface";

// const getAvailableSlots = catchAsync(async (req: Request, res: Response) => {
//     const { teacherId } = req.params;
//     const { date } = req.query;

//     // If no date provided, default to today
//     const requestedDate = date ? new Date(date as string) : new Date();
//     console.log(teacherId, requestedDate);

//     const slots = await slotServices.getAvailableSlots(teacherId as string, requestedDate);
//     console.log(slots);

//     sendResponse(res, {
//         statusCode: httpStatus.OK,
//         success: true,
//         message: "Available slots retrieved successfully",
//         data: slots,
//     });
// });
const getAvailableSlots = catchAsync(async (req: Request, res: Response) => {
    const { teacherId } = req.params;
    const { date } = req.query;

    // Parse date safely
    let requestedDate: Date;
    if (!date) {
        requestedDate = new Date();
    } else if (typeof date === "string") {
        requestedDate = new Date(date);
        if (isNaN(requestedDate.getTime())) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid date format");
        }
    } else {
        // query param is array or ParsedQs
        requestedDate = new Date(String(date));
        if (isNaN(requestedDate.getTime())) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid date format");
        }
    }

    // console.log(teacherId, requestedDate);

    const slots = await slotServices.getAvailableSlots(teacherId as string, requestedDate);

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

// const getTeacherSlots = catchAsync(async (req: Request, res: Response) => {
//     const teacherId = req.user._id;
//     const { date } = req.query;

//     const slots = await slotServices.getTeacherSlots(teacherId, date ? new Date(date as string) : undefined);

//     sendResponse(res, {
//         statusCode: httpStatus.OK,
//         success: true,
//         message: "Teacher slots retrieved successfully",
//         data: slots,
//     });
// });
const getTeacherSlots = catchAsync(async (req: Request, res: Response) => {
    const teacherId = req.user._id;
    const { date } = req.query;

    // Pass undefined if no date (fetch all future slots)
    // Parse date safely
    let requestedDate: Date;
    if (!date) {
        requestedDate = new Date();
    } else if (typeof date === "string") {
        requestedDate = new Date(date);
        if (isNaN(requestedDate.getTime())) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid date format");
        }
    } else {
        // query param is array or ParsedQs
        requestedDate = new Date(String(date));
        if (isNaN(requestedDate.getTime())) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid date format");
        }
    }

    const slots = await slotServices.getTeacherSlots(teacherId, requestedDate);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Teacher slots retrieved successfully",
        data: slots,
    });
});

const updateSlotStatusController = catchAsync(async (req: Request, res: Response) => {
    const { slotId } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(SlotStatus).includes(status)) {
        return sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: "Invalid slot status",
            data: null,
        });
    }

    const slot = await slotServices.updateSlotStatus(slotId as string, status as SlotStatus);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Slot status updated to ${status}`,
        data: slot,
    });
});

const getTeacherSlotsAdmin = catchAsync(async (req: Request, res: Response) => {
    const { teacherId } = req.params;
    const { date } = req.query;

    if (!teacherId) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Teacher ID is required");
    }

    let requestedDate: Date;
    if (!date) {
        requestedDate = new Date();
    } else if (typeof date === "string") {
        requestedDate = new Date(date);
        if (isNaN(requestedDate.getTime())) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid date format");
        }
    } else {
        requestedDate = new Date(String(date));
        if (isNaN(requestedDate.getTime())) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid date format");
        }
    }

    const slots = await slotServices.getTeacherSlots(teacherId as string, requestedDate);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Teacher slots retrieved successfully",
        data: slots,
    });
});

export const slotControllers = {
    getAvailableSlots,
    getSlotStatus,
    getTeacherSlots,
    updateSlotStatusController,
    getTeacherSlotsAdmin,
};
