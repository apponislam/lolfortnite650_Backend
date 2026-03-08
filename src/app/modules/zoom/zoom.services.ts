import axios from "axios";
import { IZoomAccessToken, IZoomMeetingCreate, IZoomMeetingResponse, IZoomRecordingResponse } from "./zoom.interface";
import { ZoomMeeting, ZoomRecording } from "./zoom.model";

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID!;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID!;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET!;

let accessToken: string | null = null;
let tokenExpiry: number | null = null;

const getAccessToken = async (): Promise<string> => {
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return accessToken;
    }

    const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64");

    const response = await axios.post<IZoomAccessToken>(
        "https://zoom.us/oauth/token",
        new URLSearchParams({
            grant_type: "account_credentials",
            account_id: ZOOM_ACCOUNT_ID,
        }),
        {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        },
    );

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000; // 60 seconds buffer

    return accessToken;
};

const createMeeting = async (meetingData: IZoomMeetingCreate, userId: string): Promise<IZoomMeetingResponse> => {
    const token = await getAccessToken();

    const response = await axios.post<IZoomMeetingResponse>(`https://api.zoom.us/v2/users/me/meetings`, meetingData, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    // Save to database
    const meeting = new ZoomMeeting({
        ...response.data,
        createdBy: userId,
    });
    await meeting.save();

    return response.data;
};

const getMeetingRecordings = async (meetingId: string): Promise<IZoomRecordingResponse> => {
    const token = await getAccessToken();

    const response = await axios.get<IZoomRecordingResponse>(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    // Find the meeting in DB
    const meeting = await ZoomMeeting.findOne({ id: parseInt(meetingId) });
    if (meeting) {
        // Save recording to DB
        const recording = new ZoomRecording({
            ...response.data,
            meeting: meeting._id,
        });
        await recording.save();
    }

    return response.data;
};

const getUserMeetings = async (userId: string) => {
    return await ZoomMeeting.find({ createdBy: userId }).sort({ createdAt: -1 });
};

const getUserRecordings = async (userId: string) => {
    const userMeetings = await ZoomMeeting.find({ createdBy: userId }).select("_id");
    const meetingIds = userMeetings.map((m) => m._id);
    return await ZoomRecording.find({ meeting: { $in: meetingIds } })
        .populate("meeting")
        .sort({ createdAt: -1 });
};

export const ZoomService = {
    createMeeting,
    getMeetingRecordings,
    getUserMeetings,
    getUserRecordings,
};
