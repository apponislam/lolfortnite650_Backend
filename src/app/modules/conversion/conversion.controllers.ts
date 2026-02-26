import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { conversationService } from "./conversion.services";

// Create new conversation
export const createConversation = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id; // assume auth middleware sets req.user
    const result = await conversationService.createConversation(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Conversation created successfully",
        data: result,
    });
});

// Get all conversations for current user
export const getUserConversations = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await conversationService.getUserConversations(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Conversations retrieved successfully",
        data: result,
    });
});

// Get single conversation by ID
export const getConversationById = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { conversationId } = req.params;
    const result = await conversationService.getConversationById(conversationId, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Conversation retrieved successfully",
        data: result,
    });
});

// Update group conversation
export const updateGroupConversation = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { conversationId } = req.params;
    const result = await conversationService.updateGroupConversation(conversationId, userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Group conversation updated successfully",
        data: result,
    });
});

// Add participants to group
export const addParticipantsToGroup = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { conversationId } = req.params;
    const { participantIds } = req.body;

    const result = await conversationService.addParticipantsToGroup(conversationId, userId, participantIds);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Participants added successfully",
        data: result,
    });
});

// Remove participant from group
export const removeParticipantFromGroup = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { conversationId, participantId } = req.params;

    const result = await conversationService.removeParticipantFromGroup(conversationId, userId, participantId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Participant removed successfully",
        data: result,
    });
});

// Mark conversation as read
export const markConversationAsRead = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { conversationId } = req.params;

    const result = await conversationService.markConversationAsRead(conversationId, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Conversation marked as read",
        data: result,
    });
});
