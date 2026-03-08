import mongoose, { Schema } from "mongoose";
import { IZoomMeeting, IZoomRecording } from "./zoom.interface";

const ZoomMeetingSchema = new Schema<IZoomMeeting>(
    {
        id: {
            type: Number,
            required: true,
            unique: true,
        },
        topic: {
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
            default: "UTC",
        },
        join_url: {
            type: String,
            required: true,
        },
        password: {
            type: String,
        },
        settings: {
            host_video: { type: Boolean, default: true },
            participant_video: { type: Boolean, default: true },
            join_before_host: { type: Boolean, default: false },
            mute_upon_entry: { type: Boolean, default: false },
            watermark: { type: Boolean, default: false },
            use_pmi: { type: Boolean, default: false },
            approval_type: { type: Number, default: 0 },
            audio: { type: String, default: "both" },
            auto_recording: { type: String, default: "none" },
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

const ZoomRecordingSchema = new Schema<IZoomRecording>(
    {
        id: {
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
        topic: {
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
        total_size: {
            type: Number,
            required: true,
        },
        recording_count: {
            type: Number,
            required: true,
        },
        recording_files: [
            {
                id: { type: String, required: true },
                meeting_id: { type: String, required: true },
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
        meeting: {
            type: Schema.Types.ObjectId,
            ref: "ZoomMeeting",
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

export const ZoomMeeting = mongoose.model<IZoomMeeting>("ZoomMeeting", ZoomMeetingSchema);
export const ZoomRecording = mongoose.model<IZoomRecording>("ZoomRecording", ZoomRecordingSchema);
