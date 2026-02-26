import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import httpStatus from "http-status";
import { ConversationModel } from "./conversion.model";
import { getSocket } from "../../socket/socket";

// -------------------- Conversation Services --------------------

/**
 * Create a new conversation (private or group)
 */
export const createConversation = async (
    currentUserId: string,
    payload: {
        type: "PRIVATE" | "GROUP";
        participantIds: string[];
        name?: string;
        adminIds?: string[];
        avatar?: string;
    },
) => {
    const { type, participantIds, name, adminIds, avatar } = payload;

    // Ensure unique participants (including current user)
    const allParticipants = Array.from(new Set([currentUserId, ...participantIds])).map((id) => new Types.ObjectId(id));

    if (type === "PRIVATE") {
        if (allParticipants.length !== 2) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Private conversation must have exactly 2 participants");
        }
        // Check if private conversation already exists between these two users
        const existing = await ConversationModel.findOne({
            type: "PRIVATE",
            participantIds: { $all: allParticipants, $size: 2 },
        });
        if (existing) {
            return existing;
        }
    }

    if (type === "GROUP") {
        if (!name) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Group conversation must have a name");
        }
        if (allParticipants.length < 3) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Group must have at least 3 participants");
        }
    }

    const conversationData: any = {
        type,
        participantIds: allParticipants,
        unreadCounts: allParticipants.map((userId) => ({
            userId,
            count: 0,
        })),
    };

    if (type === "GROUP") {
        conversationData.name = name;
        conversationData.avatar = avatar;
        conversationData.adminIds = adminIds?.map((id) => new Types.ObjectId(id)) || [new Types.ObjectId(currentUserId)];
    }

    const conversation = await ConversationModel.create(conversationData);

    // Populate participant details before returning
    await conversation.populate("participantIds", "name email avatar");

    return conversation;
};

/**
 * Get all conversations for a user (sorted by latest message)
 */
export const getUserConversations = async (userId: string) => {
    const conversations = await ConversationModel.find({
        participantIds: new Types.ObjectId(userId),
    })
        .populate("lastMessage")
        .populate("participantIds", "name email avatar")
        .sort({ updatedAt: -1 })
        .lean();

    // Add unread count for this user
    return conversations.map((conv) => {
        const unreadEntry = conv.unreadCounts.find((u) => u.userId.toString() === userId);
        return {
            ...conv,
            unreadCount: unreadEntry?.count || 0,
        };
    });
};

/**
 * Get conversation by ID
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

    const unreadEntry = conversation.unreadCounts.find((u) => u.userId.toString() === userId);
    return {
        ...conversation,
        unreadCount: unreadEntry?.count || 0,
    };
};

/**
 * Update group conversation (name, avatar, adminIds)
 */
export const updateGroupConversation = async (conversationId: string, userId: string, updates: { name?: string; avatar?: string; adminIds?: string[] }) => {
    const conversation = await ConversationModel.findOne({
        _id: conversationId,
        type: "GROUP",
        participantIds: new Types.ObjectId(userId),
    });

    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Group conversation not found");
    }

    // Check if user is admin
    if (!conversation.adminIds?.some((id) => id.toString() === userId)) {
        throw new ApiError(httpStatus.FORBIDDEN, "Only admins can update group");
    }

    if (updates.name) conversation.name = updates.name;
    if (updates.avatar) conversation.avatar = updates.avatar;
    if (updates.adminIds) {
        conversation.adminIds = updates.adminIds.map((id) => new Types.ObjectId(id));
    }

    await conversation.save();
    await conversation.populate("participantIds", "name email avatar");

    return conversation;
};

/**
 * Add participants to group
 */
export const addParticipantsToGroup = async (conversationId: string, userId: string, newParticipantIds: string[]) => {
    const conversation = await ConversationModel.findOne({
        _id: conversationId,
        type: "GROUP",
        participantIds: new Types.ObjectId(userId),
    });

    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Group conversation not found");
    }

    // Check if user is admin
    if (!conversation.adminIds?.some((id) => id.toString() === userId)) {
        throw new ApiError(httpStatus.FORBIDDEN, "Only admins can add participants");
    }

    const existingIds = conversation.participantIds.map((id) => id.toString());
    const toAdd = newParticipantIds.map((id) => new Types.ObjectId(id)).filter((id) => !existingIds.includes(id.toString()));

    if (toAdd.length === 0) {
        return conversation;
    }

    conversation.participantIds.push(...toAdd);
    // Add unreadCount entries for new participants
    toAdd.forEach((id) => {
        conversation.unreadCounts.push({ userId: id, count: 0 });
    });

    await conversation.save();
    await conversation.populate("participantIds", "name email avatar");

    // Emit socket event to new participants
    const io = getSocket();
    toAdd.forEach((participantId) => {
        io.to(`user_${participantId.toString()}`).emit("added_to_group", {
            conversationId,
            conversation: conversation.toObject(),
        });
    });

    return conversation;
};

/**
 * Remove participant from group
 */
export const removeParticipantFromGroup = async (conversationId: string, userId: string, participantIdToRemove: string) => {
    const conversation = await ConversationModel.findOne({
        _id: conversationId,
        type: "GROUP",
        participantIds: new Types.ObjectId(userId),
    });

    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Group conversation not found");
    }

    // Check if user is admin OR the one being removed is themselves (leave)
    const isAdmin = conversation.adminIds?.some((id) => id.toString() === userId);
    const isSelf = userId === participantIdToRemove;

    if (!isAdmin && !isSelf) {
        throw new ApiError(httpStatus.FORBIDDEN, "Cannot remove other participants");
    }

    const participantObjectId = new Types.ObjectId(participantIdToRemove);
    conversation.participantIds = conversation.participantIds.filter((id) => !id.equals(participantObjectId));
    conversation.unreadCounts = conversation.unreadCounts.filter((entry) => !entry.userId.equals(participantObjectId));
    // If removing admin, also remove from adminIds
    if (conversation.adminIds) {
        conversation.adminIds = conversation.adminIds.filter((id) => !id.equals(participantObjectId));
    }

    await conversation.save();

    // Emit socket event to removed participant
    const io = getSocket();
    io.to(`user_${participantIdToRemove}`).emit("removed_from_group", {
        conversationId,
    });

    return conversation;
};

/**
 * Mark all messages as read in a conversation
 */
export const markConversationAsRead = async (conversationId: string, userId: string) => {
    await (ConversationModel as any).markMessageAsRead(conversationId, userId);

    // Emit socket event to update other participants
    const io = getSocket();
    io.to(`conversation_${conversationId}`).emit("conversation_read", {
        conversationId,
        userId,
    });

    return { success: true };
};

export const conversationService = {
    createConversation,
    getUserConversations,
    getConversationById,
};
