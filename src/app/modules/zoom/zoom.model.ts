import { Schema, model } from "mongoose";
import { IZoom } from "./zoom.interface";

const ZoomSchema = new Schema<IZoom>(
    {
        meetingId: {
            type: Number,
            required: true,
            unique: true,
        },
        uuid: {
            type: String,
            required: true,
        },
        host_id: {
            type: String,
            required: true,
        },
        host_email: {
            type: String,
            required: true,
        },
        topic: {
            type: String,
            required: true,
        },
        type: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            required: true,
        },
        start_time: {
            type: String,
            required: true,
        },
        duration: {
            type: Number,
            required: true,
        },
        timezone: {
            type: String,
            required: true,
        },
        agenda: {
            type: String,
        },
        start_url: {
            type: String,
            required: true,
        },
        join_url: {
            type: String,
            required: true,
        },
        password: {
            type: String,
        },
        encrypted_password: {
            type: String,
        },
        settings: {
            host_video: { type: Boolean, default: true },
            participant_video: { type: Boolean, default: true },
            join_before_host: { type: Boolean, default: false },
            mute_upon_entry: { type: Boolean, default: true },
            watermark: { type: Boolean, default: false },
            use_pmi: { type: Boolean, default: false },
            approval_type: { type: Number, default: 0 },
            audio: { type: String, default: "both" },
            auto_recording: { type: String, default: "none" },
        },
        total_size: {
            type: Number,
        },
        recording_count: {
            type: Number,
        },
        recording_files: [
            {
                id: { type: String },
                meeting_id: { type: String },
                recording_start: { type: String },
                recording_end: { type: String },
                file_type: { type: String },
                file_size: { type: Number },
                play_url: { type: String },
                download_url: { type: String },
                status: { type: String },
                recording_type: { type: String },
            },
        ],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Performance Indexes
ZoomSchema.index({ createdBy: 1, createdAt: -1 });
ZoomSchema.index({ status: 1 });
ZoomSchema.index({ start_time: 1 });
ZoomSchema.index({ uuid: 1 });

export const ZoomModel = model<IZoom>("Zoom", ZoomSchema);
