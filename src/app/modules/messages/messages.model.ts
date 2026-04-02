import mongoose, { Schema, Document, Model } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { Conversation, Message } from "./messages.interface";

// Document interfaces
export interface ConversationDocument extends Conversation, Document {}
export interface MessageDocument extends Message, Document {}

/*
|--------------------------------------------------------------------------
| Conversation Schema
|--------------------------------------------------------------------------
*/
const ConversationSchema = new Schema<ConversationDocument>(
    {
        participantIds: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
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
| Message Subdocument Schemas
|--------------------------------------------------------------------------
*/
const MessageFileSchema = new Schema({
    url: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    thumbnailUrl: String,
});

/*
|--------------------------------------------------------------------------
| Message Schema
|--------------------------------------------------------------------------
*/
const MessageSchema = new Schema<MessageDocument>(
    {
        conversationId: {
            type: Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
            index: true,
        },
        senderId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["TEXT", "FILE", "TEXT_WITH_FILE"],
            default: "TEXT",
            required: true,
        },
        text: {
            type: String,
            trim: true,
            required: function (this: MessageDocument) {
                return ["TEXT", "TEXT_WITH_FILE"].includes(this.type);
            },
        },
        files: [MessageFileSchema],
        replyTo: {
            type: Schema.Types.ObjectId,
            ref: "Message",
        },
        isEdited: { type: Boolean, default: false },
        editedAt: Date,
        isDeleted: { type: Boolean, default: false },
        deletedAt: Date,
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

// Ensure conversations have exactly two participants
ConversationSchema.pre("save", async function (this: ConversationDocument) {
    if (this.participantIds.length !== 2) {
        throw new ApiError(400, "Conversation must have exactly 2 participants");
    }
});

// Update editedAt when message text is modified
MessageSchema.pre("save", async function (this: MessageDocument) {
    if (this.isModified("text") && !this.isNew) {
        this.isEdited = true;
        this.editedAt = new Date();
    }
});

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/
ConversationSchema.index({ participantIds: 1 });
ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index({ "unreadCounts.userId": 1, "unreadCounts.count": 1 });
ConversationSchema.index({ participantIds: 1, updatedAt: -1 });

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ type: 1 });
MessageSchema.index({ isDeleted: 1 });
MessageSchema.index({ conversationId: 1, createdAt: -1, _id: 1 });
MessageSchema.index({ replyTo: 1 });
MessageSchema.index({ text: "text" });

/*
|--------------------------------------------------------------------------
| Static Methods
|--------------------------------------------------------------------------
*/
interface ConversationModelInterface extends Model<ConversationDocument> {
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
| Models
|--------------------------------------------------------------------------
*/
export const ConversationModel = mongoose.model<ConversationDocument, ConversationModelInterface>("Conversation", ConversationSchema);
export const MessageModel = mongoose.model<MessageDocument>("Message", MessageSchema);
