import mongoose, { Schema, Document, Model } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { Conversation } from "./conversion.interface";

export interface ConversationDocument extends Conversation, Document {}

/*
|--------------------------------------------------------------------------
| Conversation Schema
|--------------------------------------------------------------------------
*/
const ConversationSchema = new Schema<ConversationDocument>(
    {
        type: {
            type: String,
            enum: ["PRIVATE", "GROUP"],
            required: true,
        },
        participantIds: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        name: {
            type: String,
            trim: true,
            required: function (this: ConversationDocument) {
                return this.type === "GROUP";
            },
        },
        avatar: String,
        adminIds: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: "Message",
        },
        unreadCounts: [
            {
                userId: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                count: {
                    type: Number,
                    default: 0,
                    min: 0,
                },
            },
        ],
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

// Ensure group conversations have a name
ConversationSchema.pre("save", async function (this: ConversationDocument) {
    if (this.type === "GROUP" && !this.name) {
        throw new ApiError(400, "Group conversation must have a name");
    }
});

// Ensure private conversations have exactly two participants
ConversationSchema.pre("save", async function (this: ConversationDocument) {
    if (this.type === "PRIVATE" && this.participantIds.length !== 2) {
        throw new ApiError(400, "Private conversation must have exactly 2 participants");
    }
});

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/
ConversationSchema.index({ participantIds: 1 });
ConversationSchema.index({ type: 1 });
ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index({ "unreadCounts.userId": 1, "unreadCounts.count": 1 });
ConversationSchema.index({ participantIds: 1, updatedAt: -1 });

/*
|--------------------------------------------------------------------------
| Static Methods
|--------------------------------------------------------------------------
*/
interface ConversationModel extends Model<ConversationDocument> {
    markMessageAsRead(conversationId: string, userId: string): Promise<any>;
    incrementUnreadCount(conversationId: string, userIds: string[], senderId: string): Promise<any>;
}

ConversationSchema.statics.markMessageAsRead = async function (conversationId: string, userId: string) {
    return this.updateOne({ _id: conversationId, "unreadCounts.userId": userId }, { $set: { "unreadCounts.$.count": 0 } });
};

ConversationSchema.statics.incrementUnreadCount = async function (conversationId: string, userIds: string[], senderId: string) {
    const excludeSender = userIds.filter((id) => id.toString() !== senderId.toString());
    return this.updateOne({ _id: conversationId }, { $inc: { "unreadCounts.$[elem].count": 1 } }, { arrayFilters: [{ "elem.userId": { $in: excludeSender } }] });
};

/*
|--------------------------------------------------------------------------
| Model
|--------------------------------------------------------------------------
*/
export const ConversationModel = mongoose.model<ConversationDocument, ConversationModel>("Conversation", ConversationSchema);
