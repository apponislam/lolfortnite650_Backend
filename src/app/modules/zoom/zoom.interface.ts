import { Types } from "mongoose";

export interface IZoomMeetingCreate {
    topic: string;
    start_time?: string; // ISO 8601 format
    duration?: number; // in minutes
    timezone?: string;
    agenda?: string;
    password?: string;
    settings?: {
        host_video?: boolean;
        participant_video?: boolean;
        join_before_host?: boolean;
        mute_upon_entry?: boolean;
        watermark?: boolean;
        use_pmi?: boolean;
        approval_type?: number;
        audio?: string;
        auto_recording?: string;
    };
}

export interface IZoomMeeting {
    _id: Types.ObjectId;
    id: number;
    topic: string;
    start_time: string;
    duration: number;
    timezone: string;
    join_url: string;
    password?: string;
    settings: {
        host_video: boolean;
        participant_video: boolean;
        join_before_host: boolean;
        mute_upon_entry: boolean;
        watermark: boolean;
        use_pmi: boolean;
        approval_type: number;
        audio: string;
        auto_recording: string;
    };
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IZoomMeetingResponse {
    id: number;
    topic: string;
    start_time: string;
    duration: number;
    timezone: string;
    join_url: string;
    password?: string;
    settings: {
        host_video: boolean;
        participant_video: boolean;
        join_before_host: boolean;
        mute_upon_entry: boolean;
        watermark: boolean;
        use_pmi: boolean;
        approval_type: number;
        audio: string;
        auto_recording: string;
    };
}

export interface IZoomRecordingFile {
    id: string;
    meeting_id: string;
    recording_start: string;
    recording_end: string;
    file_type: string;
    file_size: number;
    play_url: string;
    download_url: string;
    status: string;
    recording_type: string;
}
export interface IZoomRecording {
    _id: Types.ObjectId;
    id: number;
    uuid: string;
    host_id: string;
    topic: string;
    start_time: string;
    duration: number;
    total_size: number;
    recording_count: number;
    recording_files: IZoomRecordingFile[];
    meeting: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface IZoomRecordingResponse {
    id: number;
    uuid: string;
    host_id: string;
    topic: string;
    start_time: string;
    duration: number;
    total_size: number;
    recording_count: number;
    recording_files: IZoomRecordingFile[];
}

export interface IZoomAccessToken {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}
