// src/app/modules/card/card.controllers.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { cardServices } from "./card.services";

const initiateCardPayment = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const result = await cardServices.initiateCardPayment(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment initiated successfully",
        data: result,
    });
});

const saveCardFromPayment = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const { paymentId } = req.body;

    const result = await cardServices.saveCardFromPayment(userId, paymentId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result ? "Card saved successfully" : "No card to save",
        data: result,
    });
});

const getUserCards = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const result = await cardServices.getUserCards(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Cards retrieved successfully",
        data: result,
    });
});

const deleteCard = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const cardId = req.params.cardId as string;

    const result = await cardServices.deleteCard(userId, cardId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Card deleted successfully",
        data: result,
    });
});

const setDefaultCard = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const cardId = req.params.cardId as string;

    const result = await cardServices.setDefaultCard(userId, cardId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Default card updated successfully",
        data: result,
    });
});

export const cardControllers = {
    initiateCardPayment,
    saveCardFromPayment,
    getUserCards,
    deleteCard,
    setDefaultCard,
};
