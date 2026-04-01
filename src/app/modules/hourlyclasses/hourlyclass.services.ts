import { Types } from "mongoose";
import { HourlyClassModel } from "./hourlyclass.model";
import { HourlyClass } from "./hourlyclass.interface";
import ApiError from "../../../errors/ApiError";
import httpStatus from "http-status";

/**
 * Create a new hourly class
 */
const createHourlyClass = async (userId: string, payload: Partial<HourlyClass>) => {
    const hourlyClassData = {
        ...payload,
        createdBy: new Types.ObjectId(userId),
    };

    const result = await HourlyClassModel.create(hourlyClassData);
    return result;
};

/**
 * Get all hourly classes (with filters and pagination)
 */
const getAllHourlyClasses = async (query: any) => {
    const { page = 1, limit = 10, subject, curriculum, language, status = "APPROVED" } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filters: any = { status };
    if (subject) filters.subject = { $regex: subject, $options: "i" };
    if (curriculum) filters.curriculum = { $regex: curriculum, $options: "i" };
    if (language) filters.language = { $regex: language, $options: "i" };

    const result = await HourlyClassModel.find(filters)
        .populate("createdBy", "name email profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    const total = await HourlyClassModel.countDocuments(filters);
    const totalPages = Math.ceil(total / Number(limit));

    return {
        data: result,
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages,
        },
    };
};

/**
 * Get single hourly class by ID
 */
const getHourlyClassById = async (id: string) => {
    const result = await HourlyClassModel.findById(id).populate("createdBy", "name email profileImage");
    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, "Hourly class not found");
    }
    return result;
};

/**
 * Get tutor's hourly classes
 */
const getMyHourlyClasses = async (userId: string) => {
    const result = await HourlyClassModel.find({ createdBy: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
    return result;
};

/**
 * Update hourly class
 */
const updateHourlyClass = async (userId: string, id: string, payload: Partial<HourlyClass>) => {
    const hourlyClass = await HourlyClassModel.findById(id);
    if (!hourlyClass) {
        throw new ApiError(httpStatus.NOT_FOUND, "Hourly class not found");
    }

    if (hourlyClass.createdBy.toString() !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, "Unauthorized to update this class");
    }

    const result = await HourlyClassModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    return result;
};

export const hourlyClassServices = {
    createHourlyClass,
    getAllHourlyClasses,
    getHourlyClassById,
    getMyHourlyClasses,
    updateHourlyClass,
};
