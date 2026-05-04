import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { messageService } from "./messages.services";

// Create new conversation
const createConversation = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const result = await messageService.createConversation(userId, req.body);

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
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const result = await messageService.getUserConversations(userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Conversations retrieved successfully",
        data: result.conversations,
        meta: result.meta,
    });
});

// Get single conversation by ID
const getConversationById = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const { conversationId } = req.params;
    const result = await messageService.getConversationById(conversationId as string, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Conversation retrieved successfully",
        data: result,
    });
});

// Get messages for a conversation
const getMessages = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const { conversationId } = req.params;
    const result = await messageService.getMessages(conversationId as string, userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Messages retrieved successfully",
        data: result.messages,
        meta: result.meta,
    });
});

// Send a new message
const sendMessage = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const result = await messageService.sendMessage(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Message sent successfully",
        data: result,
    });
});

// Mark conversation as read
const markAsRead = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const { conversationId } = req.params;

    const result = await messageService.markAsRead(conversationId as string, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Messages marked as read",
        data: result,
    });
});

// Edit message
const editMessage = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const { messageId } = req.params;
    const { text } = req.body;

    const result = await messageService.editMessage(userId, messageId as string, text);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Message updated successfully",
        data: result,
    });
});

// Delete message
const deleteMessage = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const { messageId } = req.params;

    const result = await messageService.deleteMessage(userId, messageId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Message deleted successfully",
        data: result,
    });
});

// Accept offer
const acceptOffer = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const { messageId } = req.params;

    const result = await messageService.acceptOffer(userId, messageId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Offer accepted successfully",
        data: result,
    });
});

// Reject offer
const rejectOffer = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const { messageId } = req.params;

    const result = await messageService.rejectOffer(userId, messageId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Offer rejected successfully",
        data: result,
    });
});

// Reschedule offer
const rescheduleOffer = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const { messageId } = req.params;
    const { slotId, price } = req.body;

    const result = await messageService.rescheduleOffer(userId, messageId as string, slotId, price);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Offer rescheduled successfully",
        data: result,
    });
});

export const MessageControllers = {
    createConversation,
    getUserConversations,
    getConversationById,
    getMessages,
    sendMessage,
    markAsRead,
    editMessage,
    deleteMessage,
    acceptOffer,
    rejectOffer,
    rescheduleOffer,
};
