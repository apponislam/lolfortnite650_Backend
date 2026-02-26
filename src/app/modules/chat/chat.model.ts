import mongoose, { Schema, Document } from "mongoose";
import { Message } from "./chat.interfce";

export interface MessageDocument extends Message, Document {}

/*
|--------------------------------------------------------------------------
| Message File Schema (Subdocument)
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
| Message Seen Schema (Subdocument)
|--------------------------------------------------------------------------
*/
const MessageSeenSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    seenAt: { type: Date, default: Date.now, required: true },
});

/*
|--------------------------------------------------------------------------
| Message Delivery Schema (Subdocument)
|--------------------------------------------------------------------------
*/
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
| Middleware
|--------------------------------------------------------------------------
*/

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
| Model
|--------------------------------------------------------------------------
*/
export const MessageModel = mongoose.model<MessageDocument>("Message", MessageSchema);
