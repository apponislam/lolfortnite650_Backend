import axios from "axios";
import { IZoomAccessToken } from "./zoom.interface";
import { ZoomModel } from "./zoom.model";
import config from "../../config";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";

const getAccessToken = async (): Promise<string> => {
    const auth = Buffer.from(`${config.zoom.client_id!}:${config.zoom.client_secret!}`).toString("base64");

    const response = await axios.post<IZoomAccessToken>(
        "https://zoom.us/oauth/token",
        new URLSearchParams({
            grant_type: "account_credentials",
            account_id: config.zoom.account_id!,
        }),
        {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        },
    );

    return response.data.access_token;
};

const createMeeting = async (meetingData: any, userId: string) => {
    const token = await getAccessToken();

    const response = await axios.post(`https://api.zoom.us/v2/users/me/meetings`, meetingData, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    const zoomData = response.data;

    // Save to database mapping important details
    const result = await ZoomModel.create({
        meetingId: zoomData.id,
        uuid: zoomData.uuid,
        host_id: zoomData.host_id,
        host_email: zoomData.host_email,
        topic: zoomData.topic,
        type: zoomData.type,
        status: zoomData.status,
        start_time: zoomData.start_time,
        duration: zoomData.duration,
        timezone: zoomData.timezone,
        agenda: zoomData.agenda,
        start_url: zoomData.start_url,
        join_url: zoomData.join_url,
        password: zoomData.password,
        encrypted_password: zoomData.encrypted_password,
        settings: zoomData.settings,
        createdBy: userId,
    });

    return result;
};

const updateMeetingRecordings = async (meetingId: string) => {
    const token = await getAccessToken();

    try {
        const response = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const recordingData = response.data;

        // Update the meeting record with recording details
        const result = await ZoomModel.findOneAndUpdate(
            { meetingId: parseInt(meetingId) },
            {
                $set: {
                    total_size: recordingData.total_size,
                    recording_count: recordingData.recording_count,
                    recording_files: recordingData.recording_files,
                },
            },
            { new: true },
        );

        return result;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            throw new ApiError(httpStatus.NOT_FOUND, "Recordings not found for this meeting yet");
        }
        throw error;
    }
};

const getMyMeetings = async (userId: string) => {
    return await ZoomModel.find({ createdBy: userId }).sort({ createdAt: -1 });
};

const getMeetingDetails = async (meetingId: string) => {
    const result = await ZoomModel.findOne({ meetingId: parseInt(meetingId) });
    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, "Meeting not found in database");
    }
    return result;
};

export const ZoomService = {
    createMeeting,
    updateMeetingRecordings,
    getMyMeetings,
    getMeetingDetails,
};
