import { Types } from "mongoose";

export interface IZoom {
    meetingId: number;
    uuid: string;
    host_id: string;
    host_email: string;
    topic: string;
    type: number;
    status: string;
    start_time: string;
    duration: number;
    timezone: string;
    agenda?: string;
    start_url: string;
    join_url: string;
    password?: string;
    encrypted_password?: string;
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

    // Recording details (added later via webhook or manual fetch)
    total_size?: number;
    recording_count?: number;
    download_token?: string;
    recording_files?: {
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

        // drive
        drive_file_id?: string;
        drive_web_link?: string;
        uploaded_to_drive?: boolean;
    }[];

    // drive
    drive_upload_status?: "pending" | "completed" | "failed";

    classId: Types.ObjectId;
    createdBy: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IZoomAccessToken {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}
