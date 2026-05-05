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

    // 1. Verify that the current user is a STUDENT
    const currentUser = await UserModel.findById(currentUserId);
    if (!currentUser || currentUser.role !== "STUDENT") {
        throw new ApiError(httpStatus.FORBIDDEN, "Only students can initiate a conversation");
    }

    // 2. Ensure unique participants (including current user)
    const allParticipants = Array.from(new Set([currentUserId, ...participantIds])).map((id) => new Types.ObjectId(id));

    if (allParticipants.length !== 2) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Conversation must have exactly 2 participants");
    }

    // 3. Verify that the other participant is a TEACHER
    const otherUserId = participantIds.find((id) => id !== currentUserId);
    const otherUser = await UserModel.findById(otherUserId);
    if (!otherUser || otherUser.role !== "TEACHER") {
        throw new ApiError(httpStatus.BAD_REQUEST, "Conversations can only be initiated with a teacher");
    }

    // 4. Check if conversation already exists between these two users
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
    await conversation.populate("participantIds", "name email profileImage role");

    // Notify participants
    sendToUsers(conversation.participantIds, "conversation", conversation);

    return conversation;
};

/**
 * Get all conversations for a user
 */
const getUserConversations = async (userId: string, query: { page?: number; limit?: number }) => {
    const { page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const conversations = await ConversationModel.find({
        participantIds: new Types.ObjectId(userId),
    })
        .populate({
            path: "lastMessage",
            populate: [{ path: "slot" }, { path: "teacherId", select: "name email profileImage role" }],
        })
        .populate("participantIds", "name email profileImage role")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

    const total = await ConversationModel.countDocuments({
        participantIds: new Types.ObjectId(userId),
    });

    const totalPages = Math.ceil(total / Number(limit));

    const result = (conversations as any[]).map((conv) => {
        const currentUserId = userId.toString();
        const unreadEntry = conv.unreadCounts.find((u: any) => u.userId.toString() === currentUserId);
        const otherParticipants = conv.participantIds.filter((p: any) => p._id.toString() !== currentUserId);
        const myUnreadCounts = conv.unreadCounts.filter((u: any) => u.userId.toString() === currentUserId);

        return {
            ...conv,
            participantIds: otherParticipants,
            unreadCounts: myUnreadCounts,
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
        .populate("senderId", "name email profileImage")
        .populate("slot")
        .populate("teacherId", "name email profileImage role")
        .populate({
            path: "replyTo",
            populate: [{ path: "senderId", select: "name email profileImage" }, { path: "slot" }, { path: "teacherId", select: "name email profileImage role" }],
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
        .populate("participantIds", "name email profileImage role")
        .populate({
            path: "lastMessage",
            populate: [{ path: "slot" }, { path: "teacherId", select: "name email profileImage role" }],
        })
        .lean();

    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found");
    }

    const currentUserId = userId.toString();
    const unreadEntry = (conversation as any).unreadCounts.find((u: any) => u.userId.toString() === currentUserId);
    const otherParticipants = (conversation as any).participantIds.filter((p: any) => p._id.toString() !== currentUserId);
    const myUnreadCounts = (conversation as any).unreadCounts.filter((u: any) => u.userId.toString() === currentUserId);

    return {
        ...conversation,
        participantIds: otherParticipants,
        unreadCounts: myUnreadCounts,
        unreadCount: unreadEntry?.count || 0,
    };
};

/**
 * Send a new message
 */
export const sendMessage = async (senderId: string, payload: any) => {
    const { conversationId, text, type, files, replyTo, slot, subject, price } = payload;

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
    let finalPrice = price;
    let classId = payload.classId;

    // 1. Get teacherId from conversation participants (1 line)
    const teacherId = conversation.participantIds.find((p: any) => p.role === "TEACHER")?._id;

    let hourlyClass: any = null;

    if (teacherId) {
        hourlyClass = await HourlyClassModel.findOne({ createdBy: teacherId });
        if (hourlyClass) {
            // Set classId for OFFER messages if not provided
            if (finalType === "OFFER" && !classId) {
                classId = hourlyClass._id;
            }

            // Calculate price based on slot hours if slot is provided and price not already provided
            if (slot && !finalPrice) {
                const slotData = await Slot.findById(slot);
                if (slotData) {
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
        classId,
        teacherId,
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
        { path: "senderId", select: "name email profileImage role" },
        { path: "slot" },
        { path: "teacherId", select: "name email profileImage role" },
        {
            path: "replyTo",
            populate: { path: "senderId", select: "name email profileImage" },
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
    const message = await MessageModel.findById(messageId);
    if (!message || !["OFFER", "RESCHEDULED"].includes(message.type)) {
        throw new ApiError(httpStatus.NOT_FOUND, "Offer not found");
    }

    // if (message.senderId.toString() === userId) {
    //     throw new ApiError(httpStatus.FORBIDDEN, "You cannot accept your own offer");
    // }

    message.type = "ACCEPTED";
    await message.save();

    await message.populate([{ path: "senderId", select: "name email profileImage role" }, { path: "slot" }, { path: "teacherId", select: "name email profileImage role" }, { path: "replyTo", populate: { path: "senderId", select: "name email profileImage" } }]);

    const conversation = await ConversationModel.findById(message.conversationId);
    if (conversation) {
        sendToUsers(conversation.participantIds, "update", message);
        sendToUsers(conversation.participantIds, "notification", {
            conversationId: message.conversationId,
            message: message,
        });
    }
    sendToRoom(`conversation_${message.conversationId}`, "update", message);

    return message;
};

/**
 * Complete an offer (Internal service - call when payment is successful)
 */
export const completeOffer = async (messageId: string) => {
    const message = await MessageModel.findById(messageId);
    if (!message || !["OFFER", "RESCHEDULED", "ACCEPTED"].includes(message.type)) {
        throw new ApiError(httpStatus.NOT_FOUND, "Offer not found");
    }

    message.type = "COMPLETED";
    await message.save();

    await message.populate([{ path: "senderId", select: "name email profileImage role" }, { path: "slot" }, { path: "teacherId", select: "name email profileImage role" }, { path: "replyTo", populate: { path: "senderId", select: "name email profileImage" } }]);

    const conversation = await ConversationModel.findById(message.conversationId);
    if (conversation) {
        sendToUsers(conversation.participantIds, "update", message);
        sendToUsers(conversation.participantIds, "notification", {
            conversationId: message.conversationId,
            message: message,
        });
    }
    sendToRoom(`conversation_${message.conversationId}`, "update", message);

    return message;
};

/**
 * Reject an offer
 */
export const rejectOffer = async (userId: string, messageId: string) => {
    const message = await MessageModel.findById(messageId);
    if (!message || message.type !== "OFFER") {
        throw new ApiError(httpStatus.NOT_FOUND, "Offer not found");
    }

    // if (message.senderId.toString() === userId) {
    //     throw new ApiError(httpStatus.FORBIDDEN, "You cannot reject your own offer");
    // }

    message.type = "REJECTED";
    await message.save();

    await message.populate([{ path: "senderId", select: "name email profileImage role" }, { path: "slot" }, { path: "teacherId", select: "name email profileImage role" }, { path: "replyTo", populate: { path: "senderId", select: "name email profileImage" } }]);

    const conversation = await ConversationModel.findById(message.conversationId);
    if (conversation) {
        sendToUsers(conversation.participantIds, "update", message);
        sendToUsers(conversation.participantIds, "notification", {
            conversationId: message.conversationId,
            message: message,
        });
    }
    sendToRoom(`conversation_${message.conversationId}`, "update", message);

    return message;
};

/**
 * Reschedule an offer
 */
export const rescheduleOffer = async (userId: string, messageId: string, slotIdOrSlot: string, price?: number) => {
    const message = await MessageModel.findById(messageId);
    if (!message || message.type !== "OFFER") {
        throw new ApiError(httpStatus.NOT_FOUND, "Offer not found");
    }

    // if (message.senderId.toString() === userId) {
    //     throw new ApiError(httpStatus.FORBIDDEN, "You cannot reschedule your own offer");
    // }

    let finalPrice = price || message.price;
    const slotData = await Slot.findById(slotIdOrSlot);
    if (!slotData) {
        throw new ApiError(httpStatus.NOT_FOUND, "New slot not found");
    }

    const conversationData = await ConversationModel.findById(message.conversationId).populate("participantIds", "role");
    const teacherId = conversationData?.participantIds.find((p: any) => p.role === "TEACHER")?._id;
    if (teacherId) {
        message.teacherId = teacherId;
        const hourlyClass = await HourlyClassModel.findOne({ createdBy: teacherId });
        if (hourlyClass) {
            if (!price) {
                finalPrice = hourlyClass.pricePerHour * slotData.hours;
            }
            message.classId = hourlyClass._id;
        }
    }

    const userData = await UserModel.findById(userId);
    if (userData?.role === "TEACHER") {
        message.type = "RESCHEDULED";
    }

    message.slot = new Types.ObjectId(slotIdOrSlot) as any;
    message.price = finalPrice;
    await message.save();

    await message.populate([{ path: "senderId", select: "name email profileImage role" }, { path: "slot" }, { path: "teacherId", select: "name email profileImage role" }, { path: "replyTo", populate: { path: "senderId", select: "name email profileImage" } }]);

    const conversation = await ConversationModel.findById(message.conversationId);
    if (conversation) {
        sendToUsers(conversation.participantIds, "update", message);
        sendToUsers(conversation.participantIds, "notification", {
            conversationId: message.conversationId,
            message: message,
        });
    }
    sendToRoom(`conversation_${message.conversationId}`, "update", message);

    return message;
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

    // Populate slot and sender details before returning and sending to socket
    await message.populate([
        { path: "senderId", select: "name email profileImage role" },
        { path: "slot" },
        { path: "teacherId", select: "name email profileImage role" },
        {
            path: "replyTo",
            populate: { path: "senderId", select: "name email profileImage" },
        },
    ]);

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
    completeOffer,
};
