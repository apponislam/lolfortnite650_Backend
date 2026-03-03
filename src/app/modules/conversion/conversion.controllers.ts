import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { conversationService } from "./conversion.services";

// Create new conversation
const createConversation = catchAsync(async (req: Request, res: Response) => {
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
const getUserConversations = catchAsync(async (req: Request, res: Response) => {
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
const getConversationById = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { conversationId } = req.params;
    const result = await conversationService.getConversationById(conversationId as string, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Conversation retrieved successfully",
        data: result,
    });
});

// Update group conversation
const updateGroupConversation = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { conversationId } = req.params;
    const result = await conversationService.updateGroupConversation(conversationId as string, userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Group conversation updated successfully",
        data: result,
    });
});

// Add participants to group
const addParticipantsToGroup = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { conversationId } = req.params;
    const { participantIds } = req.body;

    const result = await conversationService.addParticipantsToGroup(conversationId as string, userId, participantIds);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Participants added successfully",
        data: result,
    });
});

// Remove participant from group
const removeParticipantFromGroup = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { conversationId, participantId } = req.params;

    const result = await conversationService.removeParticipantFromGroup(conversationId as string, userId, participantId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Participant removed successfully",
        data: result,
    });
});

// Mark conversation as read
const markConversationAsRead = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { conversationId } = req.params;

    const result = await conversationService.markConversationAsRead(conversationId as string, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Conversation marked as read",
        data: result,
    });
});

export const ConversationControllers = {
    createConversation,
    getUserConversations,
    getConversationById,
    updateGroupConversation,
    addParticipantsToGroup,
    removeParticipantFromGroup,
    markConversationAsRead,
};
