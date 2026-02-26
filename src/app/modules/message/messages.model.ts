import mongoose, { Schema, Document, Model, CallbackWithoutResultAndOptionalError } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { Conversation, Message } from "./messages.types";

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

// Subdocument schemas
const MessageFileSchema = new Schema({
    url: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    thumbnailUrl: String,
});

const MessageSeenSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    seenAt: { type: Date, default: Date.now, required: true },
});

const MessageDeliverySchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deliveredAt: { type: Date, default: Date.now, required: true },
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
            enum: ["TEXT", "FILE", "TEXT_WITH_FILE", "SYSTEM", "MEETING"],
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
        meeting: {
            provider: {
                type: String,
                enum: ["ZOOM"],
                required: function (this: MessageDocument) {
                    return this.type === "MEETING";
                },
            },
            meetingId: {
                type: String,
                required: function (this: MessageDocument) {
                    return this.type === "MEETING";
                },
            },
            meetingLink: {
                type: String,
                required: function (this: MessageDocument) {
                    return this.type === "MEETING";
                },
            },
            recordingLink: String,
            scheduledAt: Date,
        },
        seenBy: [MessageSeenSchema],
        deliveredTo: [MessageDeliverySchema],
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
| Middleware – Fixed: Let Mongoose infer `next`, cast `this` inside
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
// Conversation indexes
ConversationSchema.index({ participantIds: 1 });
ConversationSchema.index({ type: 1 });
ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index({ "unreadCounts.userId": 1, "unreadCounts.count": 1 });
ConversationSchema.index({ participantIds: 1, updatedAt: -1 });

// Message indexes
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ type: 1 });
MessageSchema.index({ isDeleted: 1 });
MessageSchema.index({ "seenBy.userId": 1 });
MessageSchema.index({ "deliveredTo.userId": 1 });
MessageSchema.index({ conversationId: 1, createdAt: -1, _id: 1 });
MessageSchema.index({ conversationId: 1, "seenBy.userId": 1 });
MessageSchema.index({ replyTo: 1 });
MessageSchema.index({ text: "text" });

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
| Models
|--------------------------------------------------------------------------
*/
export const ConversationModel = mongoose.model<ConversationDocument, ConversationModel>("Conversation", ConversationSchema);
export const MessageModel = mongoose.model<MessageDocument>("Message", MessageSchema);
