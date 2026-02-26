import { Types } from "mongoose";

export type ConversationType = "PRIVATE" | "GROUP";
export interface Conversation {
    type: ConversationType;
    participantIds: Types.ObjectId[];
    name?: string;
    avatar?: string;
    adminIds?: Types.ObjectId[];
    lastMessage?: Types.ObjectId;
    unreadCounts: {
        userId: Types.ObjectId;
        count: number;
    }[];
    createdAt: Date;
    updatedAt: Date;
}
