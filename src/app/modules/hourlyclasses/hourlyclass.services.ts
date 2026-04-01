import { Types } from "mongoose";
import { HourlyClassModel } from "./hourlyclass.model";
import { HourlyClass } from "./hourlyclass.interface";
import ApiError from "../../../errors/ApiError";
import httpStatus from "http-status";

/**
 * Create or Update hourly class (Upsert)
 */
const createOrUpdateHourlyClass = async (userId: string, payload: Partial<HourlyClass>) => {
    const filter = { createdBy: new Types.ObjectId(userId) };
    const update = {
        ...payload,
        createdBy: new Types.ObjectId(userId),
    };

    const result = await HourlyClassModel.findOneAndUpdate(filter, update, {
        new: true,
        upsert: true,
        runValidators: true,
    });
    return result;
};

/**
 * Get all hourly classes (with filters and pagination)
 */
const getAllHourlyClasses = async (query: any) => {
    const { page = 1, limit = 10, subjects, curriculum, language } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filters: any = {};
    if (subjects) {
        const subjectArray = Array.isArray(subjects) ? subjects : [subjects];
        filters.subjects = { $in: subjectArray.map((s: string) => new RegExp(s, "i")) };
    }
    if (curriculum) filters.curriculum = { $regex: curriculum, $options: "i" };
    if (language) filters.language = { $regex: language, $options: "i" };

    const result = await HourlyClassModel.find(filters).populate("createdBy", "name email profileImage").sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

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
 * Get my hourly class
 */
const getMyHourlyClass = async (userId: string) => {
    const result = await HourlyClassModel.findOne({ createdBy: new Types.ObjectId(userId) });
    return result;
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

export const hourlyClassServices = {
    createOrUpdateHourlyClass,
    getAllHourlyClasses,
    getHourlyClassById,
    getMyHourlyClass,
};
