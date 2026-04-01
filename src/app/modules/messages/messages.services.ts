import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import httpStatus from "http-status";
import { ConversationModel, MessageModel } from "./messages.model";
import { getSocket } from "../../socket/socket";

/**
 * Create a new conversation (private)
 */
export const createConversation = async (
    currentUserId: string,
    payload: {
        participantIds: string[];
    },
) => {
    const { participantIds } = payload;

    // Ensure unique participants (including current user)
    const allParticipants = Array.from(new Set([currentUserId, ...participantIds])).map((id) => new Types.ObjectId(id));

    if (allParticipants.length !== 2) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Conversation must have exactly 2 participants");
    }

    // Check if conversation already exists between these two users
    const existing = await ConversationModel.findOne({
        participantIds: { $all: allParticipants, $size: 2 },
    });

    if (existing) {
        return existing;
    }

    const conversationData = {
        participantIds: allParticipants,
        unreadCounts: allParticipants.map((userId) => ({
            userId,
            count: 0,
        })),
    };

    const conversation = await ConversationModel.create(conversationData);

    // Populate participant details before returning
    await conversation.populate("participantIds", "name email avatar");

    return conversation;
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId: string, query: { page?: number; limit?: number }) => {
    const { page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const conversations = await ConversationModel.find({
        participantIds: new Types.ObjectId(userId),
    })
        .populate("lastMessage")
        .populate("participantIds", "name email avatar")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

    const total = await ConversationModel.countDocuments({
        participantIds: new Types.ObjectId(userId),
    });

    const totalPages = Math.ceil(total / Number(limit));

    const result = (conversations as any[]).map((conv) => {
        const unreadEntry = conv.unreadCounts.find((u: any) => u.userId.toString() === userId);
        return {
            ...conv,
            unreadCount: unreadEntry?.count || 0,
        };
    });

    return {
        conversations: result,
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages,
            hasNext: Number(page) < totalPages,
            hasPrev: Number(page) > 1,
        },
    };
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (conversationId: string, userId: string, query: { page?: number; limit?: number }) => {
    // Verify user is part of the conversation
    const conversation = await ConversationModel.findOne({
        _id: conversationId,
        participantIds: new Types.ObjectId(userId),
    });

    if (!conversation) {
        throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
    }

    const { page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const messages = await MessageModel.find({ conversationId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate("senderId", "name email avatar").lean();

    const total = await MessageModel.countDocuments({ conversationId });
    const totalPages = Math.ceil(total / Number(limit));

    return {
        messages: messages.reverse(),
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages,
            hasNext: Number(page) < totalPages,
            hasPrev: Number(page) > 1,
        },
    };
};

/**
 * Get single conversation by ID
 */
export const getConversationById = async (conversationId: string, userId: string) => {
    const conversation = await ConversationModel.findOne({
        _id: conversationId,
        participantIds: new Types.ObjectId(userId),
    })
        .populate("participantIds", "name email avatar")
        .populate("lastMessage")
        .lean();

    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found");
    }

    const unreadEntry = (conversation as any).unreadCounts.find((u: any) => u.userId.toString() === userId);
    return {
        ...conversation,
        unreadCount: unreadEntry?.count || 0,
    };
};

/**
 * Send a new message
 */
export const sendMessage = async (senderId: string, payload: any) => {
    const { conversationId, text, type, files, replyTo } = payload;

    // Verify conversation exists and user is part of it
    const conversation = await ConversationModel.findOne({
        _id: conversationId,
        participantIds: new Types.ObjectId(senderId),
    });

    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found");
    }

    const messageData = {
        conversationId,
        senderId,
        text,
        type: type || "TEXT",
        files,
        replyTo,
    };

    const message = await MessageModel.create(messageData);

    // Update conversation's last message and increment unread counts
    await ConversationModel.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
    });

    await (ConversationModel as any).incrementUnreadCount(conversationId, conversation.participantIds, senderId);

    await message.populate("senderId", "name email avatar");

    // Emit socket event
    const io = getSocket();

    // Emit to conversation room (for people currently in the chat)
    io.to(`conversation_${conversationId}`).emit("new_message", message);

    // Also emit specifically to all participants using their user rooms
    conversation.participantIds.forEach((participantId) => {
        io.to(`user_${participantId.toString()}`).emit("new_message_notification", {
            conversationId,
            message,
        });
    });

    return message;
};

/**
 * Mark all messages as read in a conversation
 */
export const markAsRead = async (conversationId: string, userId: string) => {
    await (ConversationModel as any).markMessageAsRead(conversationId, userId);

    const io = getSocket();

    // Notify the user in their own room
    io.to(`user_${userId}`).emit("conversation_read", {
        conversationId,
        userId,
    });

    // Notify other participants
    io.to(`conversation_${conversationId}`).emit("conversation_read", {
        conversationId,
        userId,
    });

    return { success: true };
};

/**
 * Edit a message
 */
export const editMessage = async (userId: string, messageId: string, text: string) => {
    const message = await MessageModel.findOne({
        _id: messageId,
        senderId: new Types.ObjectId(userId),
    });

    if (!message) {
        throw new ApiError(httpStatus.NOT_FOUND, "Message not found or unauthorized");
    }

    message.text = text;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const io = getSocket();
    io.to(`conversation_${message.conversationId}`).emit("message_updated", message);

    return message;
};

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = async (userId: string, messageId: string) => {
    const message = await MessageModel.findOne({
        _id: messageId,
        senderId: new Types.ObjectId(userId),
    });

    if (!message) {
        throw new ApiError(httpStatus.NOT_FOUND, "Message not found or unauthorized");
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    const io = getSocket();
    io.to(`conversation_${message.conversationId}`).emit("message_deleted", {
        messageId,
        conversationId: message.conversationId,
    });

    return { success: true };
};

export const messageService = {
    createConversation,
    getUserConversations,
    getConversationById,
    getMessages,
    sendMessage,
    markAsRead,
    editMessage,
    deleteMessage,
};
