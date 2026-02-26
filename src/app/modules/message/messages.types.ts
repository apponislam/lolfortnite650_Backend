export type ConversationType = "PRIVATE" | "GROUP";

export interface Conversation {
    _id: string;

    type: ConversationType;

    // Users inside this chat
    participantIds: string[];

    // For group only
    name?: string;
    avatar?: string;
    adminIds?: string[];

    // Last message reference (for chat list preview)
    lastMessage?: {
        _id: string;
        text?: string;
        senderId: string;
        createdAt: Date;
    };

    // Unread count per user (fast performance for sidebar)
    unreadCount: {
        userId: string;
        count: number;
    }[];

    createdAt: Date;
    updatedAt: Date;
}

export type MessageType = "TEXT" | "FILE" | "TEXT_WITH_FILE" | "SYSTEM";

export interface MessageFile {
    url: string;
    fileName: string;
    fileSize: number; // in bytes
    mimeType: string;
    thumbnailUrl?: string; // optional for images/videos
}

export interface MessageSeen {
    userId: string;
    seenAt: Date;
}

export interface Message {
    _id: string;

    conversationId: string;

    senderId: string;

    type: MessageType;

    // Content
    text?: string;
    files?: MessageFile[];

    // Seen tracking (empty = unseen by everyone except sender)
    seenBy: MessageSeen[];

    // Delivery tracking (optional but recommended)
    deliveredTo: {
        userId: string;
        deliveredAt: Date;
    }[];

    // Status
    isEdited: boolean;
    editedAt?: Date;

    isDeleted: boolean;
    deletedAt?: Date;

    // Reply support (important for modern chat)
    replyToMessageId?: string;

    createdAt: Date;
    updatedAt: Date;
}
