import { Types } from "mongoose";

export type MessageType = "TEXT" | "FILE" | "TEXT_WITH_FILE" | "SYSTEM" | "MEETING";
export interface MessageFile {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    thumbnailUrl?: string;
}
export interface MessageSeen {
    userId: Types.ObjectId;
    seenAt: Date;
}
export interface MessageDelivery {
    userId: Types.ObjectId;
    deliveredAt: Date;
}
export interface Message {
    conversationId: Types.ObjectId;
    senderId: Types.ObjectId;
    type: MessageType;
    text?: string;
    files?: MessageFile[];
    meeting?: {
        provider: "ZOOM";
        meetingId: string;
        meetingLink: string;
        recordingLink?: string;
        scheduledAt?: Date;
    };
    seenBy: MessageSeen[];
    deliveredTo: MessageDelivery[];
    replyTo?: string;
    isEdited: boolean;
    editedAt?: Date;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
