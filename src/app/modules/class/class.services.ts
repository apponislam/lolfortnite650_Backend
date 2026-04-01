import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { ClassModel } from "./class.model";
import { ClassStatus } from "./class.interface";

const createClass = async (userId: string, payload: any) => {
    const data = {
        ...payload,
        createdBy: new Types.ObjectId(userId),
        status: "DRAFT" as ClassStatus,
    };

    const result = await ClassModel.create(data);
    return result;
};

const getClasses = async (query: any = {}) => {
    const { page = 1, limit = 10, status, classType, subject, level, language, curriculum, search, minPrice, maxPrice, sortBy = "createdAt", sortOrder = "desc" } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filters: any = {};

    // Text Search
    if (search) {
        filters.$text = { $search: search };
    }

    // Exact or partial matches
    if (status) filters.status = status;
    if (classType) filters.classType = classType;
    if (subject) filters.subject = { $regex: subject, $options: "i" };
    if (level) filters.level = level;
    if (language) filters.language = language;
    if (curriculum) filters.curriculum = curriculum;

    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
        filters.price = {};
        if (minPrice !== undefined) filters.price.$gte = Number(minPrice);
        if (maxPrice !== undefined) filters.price.$lte = Number(maxPrice);
    }

    // Sort options
    const sort: any = {};
    if (search) {
        sort.score = { $meta: "textScore" };
    } else {
        sort[sortBy] = sortOrder === "asc" ? 1 : -1;
    }

    const queryBuilder = ClassModel.find(filters);

    if (search) {
        queryBuilder.select({ score: { $meta: "textScore" } });
    }

    const result = await queryBuilder
        .populate("createdBy", "name email profileImage")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean();

    const total = await ClassModel.countDocuments(filters);
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

const getClassById = async (classId: string) => {
    const result = await ClassModel.findById(classId);
    if (!result) throw new ApiError(httpStatus.NOT_FOUND, "Class not found");
    return result;
};

const updateClass = async (classId: string, userId: string, payload: any) => {
    const cls = await ClassModel.findById(classId);
    if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found");

    if (cls.createdBy.toString() !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, "Only the creator can update this class");
    }

    // Remove images if requested
    if (payload.imagesToRemove && Array.isArray(payload.imagesToRemove)) {
        cls.images = cls.images.filter((img) => !payload.imagesToRemove.includes(img));
    }

    // Add new images from upload middleware
    if (payload.images && Array.isArray(payload.images)) {
        cls.images.push(...payload.images);
    }

    // Remove imagesToRemove from payload so Object.assign doesn't overwrite
    delete payload.images;
    delete payload.imagesToRemove;

    Object.assign(cls, payload);
    await cls.save();
    return cls;
};

const deleteClass = async (classId: string, userId: string, role?: string) => {
    const cls = await ClassModel.findById(classId);
    if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found");

    if (cls.createdBy.toString() !== userId && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to delete this class");
    }

    await ClassModel.deleteOne({ _id: classId });
    return;
};

const submitForReview = async (classId: string, userId: string) => {
    const cls = await ClassModel.findById(classId);
    if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found");

    if (cls.createdBy.toString() !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, "Only the creator can submit for review");
    }

    cls.status = "PENDING";
    await cls.save();
    return cls;
};

const setClassStatus = async (classId: string, status: ClassStatus) => {
    const cls = await ClassModel.findById(classId);
    if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found");

    cls.status = status;
    await cls.save();
    return cls;
};

export const classServices = {
    createClass,
    getClasses,
    getClassById,
    updateClass,
    deleteClass,
    submitForReview,
    setClassStatus,
};
