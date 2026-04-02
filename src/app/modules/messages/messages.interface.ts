import { Types } from "mongoose";

export interface Conversation {
    participantIds: Types.ObjectId[];
    lastMessage?: Types.ObjectId;
    unreadCounts: {
        userId: Types.ObjectId;
        count: number;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

export type MessageType = "TEXT" | "FILE" | "TEXT_WITH_FILE";

export interface MessageFile {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    thumbnailUrl?: string;
}

export interface Message {
    conversationId: Types.ObjectId;
    senderId: Types.ObjectId;
    type: MessageType;
    text?: string;
    files?: MessageFile[];
    replyTo?: Types.ObjectId | Message;
    isEdited: boolean;
    editedAt?: Date;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
