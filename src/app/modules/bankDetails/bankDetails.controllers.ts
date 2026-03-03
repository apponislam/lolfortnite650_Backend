import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { bankDetailsServices } from "./bankDetails.services";

const addBankAccount = catchAsync(async (req: Request, res: Response) => {
    const result = await bankDetailsServices.addBankAccount(req.user._id, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Bank account added successfully",
        data: result,
    });
});

const getMyBankAccounts = catchAsync(async (req: Request, res: Response) => {
    const result = await bankDetailsServices.getBankAccountsByUser(req.user._id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Bank accounts retrieved successfully",
        data: result,
    });
});

const getBankAccountById = catchAsync(async (req: Request, res: Response) => {
    const result = await bankDetailsServices.getBankAccountById(req.params.accountId as string, req.user._id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Bank account retrieved successfully",
        data: result,
    });
});

const updateBankAccount = catchAsync(async (req: Request, res: Response) => {
    const result = await bankDetailsServices.updateBankAccount(req.params.accountId as string, req.user._id, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Bank account updated successfully",
        data: result,
    });
});

const setDefaultAccount = catchAsync(async (req: Request, res: Response) => {
    const result = await bankDetailsServices.setDefaultAccount(req.params.accountId as string, req.user._id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Default bank account updated",
        data: result,
    });
});

const deleteBankAccount = catchAsync(async (req: Request, res: Response) => {
    await bankDetailsServices.deleteBankAccount(req.params.accountId as string, req.user._id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Bank account deleted successfully",
        data: null,
    });
});

const verifyBankAccount = catchAsync(async (req: Request, res: Response) => {
    const result = await bankDetailsServices.verifyBankAccount(req.params.accountId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Bank account verified successfully",
        data: result,
    });
});

export const bankDetailsControllers = {
    addBankAccount,
    getMyBankAccounts,
    getBankAccountById,
    updateBankAccount,
    setDefaultAccount,
    deleteBankAccount,
    verifyBankAccount,
};
