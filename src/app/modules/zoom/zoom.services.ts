import axios from "axios";
import { IZoomAccessToken } from "./zoom.interface";
import { ZoomModel } from "./zoom.model";
import config from "../../config";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { Types } from "mongoose";
import { ClassModel } from "../class/class.model";
import { ClassPaymentModel } from "../classpayments/classpayments.model";
import { sendZoomMeetingInvitation } from "../../../utils/emailTemplates";

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
    const { classId, ...zoomPayload } = meetingData;

    if (!classId) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Class ID is required");
    }

    if (!Types.ObjectId.isValid(classId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Class ID");
    }

    const classData = await ClassModel.findById(classId);

    if (!classData) {
        throw new ApiError(httpStatus.NOT_FOUND, "Class not found");
    }

    if (classData.runningStatus === "COMPLETED") {
        throw new ApiError(httpStatus.BAD_REQUEST, "Cannot create meeting for a completed class");
    }

    const token = await getAccessToken();

    try {
        const response = await axios.post(
            `https://api.zoom.us/v2/users/me/meetings`,
            {
                type: 2, // Default to scheduled meeting
                ...zoomPayload,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            },
        );

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
            classId,
            createdBy: userId,
        });

        // after create zoom find enrolled students from class payments then sent a email to them with meeting link
        const enrolledStudents = await ClassPaymentModel.find({ classId: new Types.ObjectId(classId), status: "PAID" }).populate("student", "name email");
        // send email to each student with meeting link
        enrolledStudents.forEach((student: any) => {
            sendZoomMeetingInvitation(student.student.email, student.student.name, zoomData.topic, zoomData.id, zoomData.join_url, zoomData.start_time);
        });

        return result;
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            const zoomError = error.response?.data;
            console.error("Zoom API Error Details:", JSON.stringify(zoomError, null, 2));
            throw new ApiError(error.response?.status || httpStatus.INTERNAL_SERVER_ERROR, zoomError?.message || "Zoom API Request Failed");
        }
        throw error;
    }
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

const getMyMeetings = async (userId: string, query: any) => {
    const { page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const result = await ZoomModel.find({ createdBy: userId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

    const total = await ZoomModel.countDocuments({ createdBy: userId });

    return {
        data: result,
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
        },
    };
};

const getMeetingDetails = async (meetingId: string) => {
    const result = await ZoomModel.findOne({ meetingId: parseInt(meetingId) });
    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, "Meeting not found in database");
    }
    return result;
};

const getMeetingsByClass = async (classId: string, query: any) => {
    if (!Types.ObjectId.isValid(classId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Class ID");
    }

    const { page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const result = await ZoomModel.find({ classId: new Types.ObjectId(classId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    const total = await ZoomModel.countDocuments({ classId: new Types.ObjectId(classId) });

    return {
        data: result,
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
        },
    };
};

export const ZoomService = {
    createMeeting,
    updateMeetingRecordings,
    getMyMeetings,
    getMeetingDetails,
    getMeetingsByClass,
};
