import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { contactServices } from "./contact.services";

const upsertContact = catchAsync(async (req: Request, res: Response) => {
    const result = await contactServices.upsertContact(req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Contact information saved successfully",
        data: result,
    });
});

const getContact = catchAsync(async (req: Request, res: Response) => {
    const result = await contactServices.getContact();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Contact information retrieved successfully",
        data: result,
    });
});

export const contactControllers = {
    upsertContact,
    getContact,
};
