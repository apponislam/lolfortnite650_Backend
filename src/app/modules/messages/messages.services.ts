import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import httpStatus from "http-status";
import { ConversationModel, MessageModel } from "./messages.model";
import { sendToRoom, sendToUsers } from "../../socket/socket";
import { UserModel } from "../auth/auth.model";
import { Slot } from "../slot/slot.model";
import { HourlyClassModel } from "../hourlyclasses/hourlyclass.model";

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
    await conversation.populate("participantIds", "name email avatar role");

    // Notify participants
    sendToUsers(conversation.participantIds, "conversation", conversation);

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

    // Mark as read for this user when they fetch messages
    await (ConversationModel as any).markMessageAsRead(conversationId, userId);

    const { page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const messages = await MessageModel.find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("senderId", "name email avatar")
        .populate({
            path: "replyTo",
            populate: { path: "senderId", select: "name email avatar" },
        })
        .lean();

    const total = await MessageModel.countDocuments({ conversationId });
    const totalPages = Math.ceil(total / Number(limit));

    // Notify that messages are read
    sendToUsers(conversation.participantIds, "read", { conversationId, userId });
    sendToRoom(`conversation_${conversationId}`, "read", { conversationId, userId });

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
    const { conversationId, text, type, files, replyTo, slot, subject } = payload;

    // Verify conversation exists and user is part of it
    const conversation = await ConversationModel.findOne({
        _id: conversationId,
        participantIds: new Types.ObjectId(senderId),
    }).populate("participantIds", "role");

    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found");
    }

    const sender = await UserModel.findById(senderId);
    if (!sender) {
        throw new ApiError(httpStatus.NOT_FOUND, "Sender not found");
    }

    let finalType = type || "MESSAGE";
    let finalPrice = payload.price;

    // Calculate price based on slot hours if slot is provided
    if (slot) {
        const slotData = await Slot.findById(slot);
        if (slotData) {
            const teacherId = conversation.participantIds.find((p: any) => p.role === "TEACHER")?._id;
            if (teacherId) {
                const hourlyClass = await HourlyClassModel.findOne({ createdBy: teacherId });
                if (hourlyClass) {
                    finalPrice = hourlyClass.pricePerHour * slotData.hours;
                }
            }
        }
    }

    const messageData: any = {
        conversationId,
        senderId,
        text,
        type: finalType,
        files,
        replyTo,
        slot,
        subject,
        price: finalPrice,
    };

    const message = await MessageModel.create(messageData);

    // Update conversation's last message and increment unread counts
    await ConversationModel.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
    });

    await (ConversationModel as any).incrementUnreadCount(
        conversationId,
        conversation.participantIds.map((p: any) => p._id),
        senderId,
    );

    await message.populate([
        { path: "senderId", select: "name email avatar role" },
        { path: "slot" },
        {
            path: "replyTo",
            populate: { path: "senderId", select: "name email avatar" },
        },
    ]);

    // Notify other participant (avoids duplicate for sender)
    const others = conversation.participantIds.filter((p: any) => p._id.toString() !== senderId.toString());
    sendToUsers(
        others.map((p: any) => p._id),
        "message",
        message,
    );
    sendToUsers(
        others.map((p: any) => p._id),
        "notification",
        { conversationId, message },
    );
    sendToRoom(`conversation_${conversationId}`, "message", message);

    return message;
};

/**
 * Accept an offer
 */
export const acceptOffer = async (userId: string, messageId: string) => {
    const originalMessage = await MessageModel.findById(messageId);
    if (!originalMessage || originalMessage.type !== "OFFER") {
        throw new ApiError(httpStatus.NOT_FOUND, "Offer not found");
    }

    if (originalMessage.senderId.toString() === userId) {
        throw new ApiError(httpStatus.FORBIDDEN, "You cannot accept your own offer");
    }

    const newMessage = await MessageModel.create({
        conversationId: originalMessage.conversationId,
        senderId: userId,
        type: "ACCEPTED",
        slot: originalMessage.slot,
        subject: originalMessage.subject,
        price: originalMessage.price,
        replyTo: originalMessage._id,
    });

    await ConversationModel.findByIdAndUpdate(originalMessage.conversationId, {
        lastMessage: newMessage._id,
    });

    await newMessage.populate([{ path: "senderId", select: "name email avatar role" }, { path: "slot" }, { path: "replyTo", populate: { path: "senderId", select: "name email avatar" } }]);

    const conversation = await ConversationModel.findById(originalMessage.conversationId);
    if (conversation) {
        sendToUsers(conversation.participantIds, "message", newMessage);
        sendToUsers(conversation.participantIds, "notification", {
            conversationId: originalMessage.conversationId,
            message: newMessage,
        });
    }
    sendToRoom(`conversation_${originalMessage.conversationId}`, "message", newMessage);

    return newMessage;
};

/**
 * Reject an offer
 */
export const rejectOffer = async (userId: string, messageId: string) => {
    const originalMessage = await MessageModel.findById(messageId);
    if (!originalMessage || originalMessage.type !== "OFFER") {
        throw new ApiError(httpStatus.NOT_FOUND, "Offer not found");
    }

    if (originalMessage.senderId.toString() === userId) {
        throw new ApiError(httpStatus.FORBIDDEN, "You cannot reject your own offer");
    }

    const newMessage = await MessageModel.create({
        conversationId: originalMessage.conversationId,
        senderId: userId,
        type: "REJECTED",
        slot: originalMessage.slot,
        subject: originalMessage.subject,
        price: originalMessage.price,
        replyTo: originalMessage._id,
    });

    await ConversationModel.findByIdAndUpdate(originalMessage.conversationId, {
        lastMessage: newMessage._id,
    });

    await newMessage.populate([{ path: "senderId", select: "name email avatar role" }, { path: "slot" }, { path: "replyTo", populate: { path: "senderId", select: "name email avatar" } }]);

    const conversation = await ConversationModel.findById(originalMessage.conversationId);
    if (conversation) {
        sendToUsers(conversation.participantIds, "message", newMessage);
        sendToUsers(conversation.participantIds, "notification", {
            conversationId: originalMessage.conversationId,
            message: newMessage,
        });
    }
    sendToRoom(`conversation_${originalMessage.conversationId}`, "message", newMessage);

    return newMessage;
};

/**
 * Reschedule an offer
 */
export const rescheduleOffer = async (userId: string, messageId: string, slotId: string) => {
    const originalMessage = await MessageModel.findById(messageId);
    if (!originalMessage || originalMessage.type !== "OFFER") {
        throw new ApiError(httpStatus.NOT_FOUND, "Offer not found");
    }

    if (originalMessage.senderId.toString() === userId) {
        throw new ApiError(httpStatus.FORBIDDEN, "You cannot reschedule your own offer");
    }

    let finalPrice = originalMessage.price;
    const slotData = await Slot.findById(slotId);
    if (!slotData) {
        throw new ApiError(httpStatus.NOT_FOUND, "New slot not found");
    }

    const conversationData = await ConversationModel.findById(originalMessage.conversationId).populate("participantIds", "role");
    const teacherId = conversationData?.participantIds.find((p: any) => p.role === "TEACHER")?._id;
    if (teacherId) {
        const hourlyClass = await HourlyClassModel.findOne({ createdBy: teacherId });
        if (hourlyClass) {
            finalPrice = hourlyClass.pricePerHour * slotData.hours;
        }
    }

    const newMessage = await MessageModel.create({
        conversationId: originalMessage.conversationId,
        senderId: userId,
        type: "RESCHEDULED",
        slot: new Types.ObjectId(slotId),
        subject: originalMessage.subject,
        price: finalPrice,
        replyTo: originalMessage._id,
    });

    await ConversationModel.findByIdAndUpdate(originalMessage.conversationId, {
        lastMessage: newMessage._id,
    });

    await newMessage.populate([{ path: "senderId", select: "name email avatar role" }, { path: "slot" }, { path: "replyTo", populate: { path: "senderId", select: "name email avatar" } }]);

    const conversation = await ConversationModel.findById(originalMessage.conversationId);
    if (conversation) {
        sendToUsers(conversation.participantIds, "message", newMessage);
        sendToUsers(conversation.participantIds, "notification", {
            conversationId: originalMessage.conversationId,
            message: newMessage,
        });
    }
    sendToRoom(`conversation_${originalMessage.conversationId}`, "message", newMessage);

    return newMessage;
};

/**
 * Mark all messages as read in a conversation
 */
export const markAsRead = async (conversationId: string, userId: string) => {
    const conversation = await ConversationModel.findOne({
        _id: conversationId,
        participantIds: new Types.ObjectId(userId),
    });

    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found");
    }

    await (ConversationModel as any).markMessageAsRead(conversationId, userId);

    // Notify participants
    sendToUsers(conversation.participantIds, "read", { conversationId, userId });
    sendToRoom(`conversation_${conversationId}`, "read", { conversationId, userId });

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

    // Notify participants
    const conversation = await ConversationModel.findById(message.conversationId);
    if (conversation) {
        sendToUsers(conversation.participantIds, "update", message);
    }
    sendToRoom(`conversation_${message.conversationId}`, "update", message);

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

    const data = { messageId, conversationId: message.conversationId };

    // Notify participants
    const conversation = await ConversationModel.findById(message.conversationId);
    if (conversation) {
        sendToUsers(conversation.participantIds, "delete", data);
    }
    sendToRoom(`conversation_${message.conversationId}`, "delete", data);

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
    acceptOffer,
    rejectOffer,
    rescheduleOffer,
};
