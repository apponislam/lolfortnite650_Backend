import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { ClassModel } from "./class.model";
import { ClassStatus } from "./class.interface";
import { ClassPaymentModel } from "../classpayments/classpayments.model";
import { RatingModel } from "../rating/rating.model";

const createClass = async (userId: string, payload: any) => {
    const data = {
        ...payload,
        createdBy: new Types.ObjectId(userId),
        status: "PENDING" as ClassStatus,
    };

    const result = await ClassModel.create(data);
    return result;
};

const getClasses = async (query: any = {}, user?: any) => {
    const { page = 1, limit = 10, status, classType, runningStatus, subject, level, language, curriculum, search, minPrice, maxPrice, sortBy = "createdAt", sortOrder = "desc", isFull } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filters: any = { isDeleted: false, status: "APPROVED" };

    // Text Search
    if (search) {
        filters.$text = { $search: search };
    }

    // Exact or partial matches
    if (classType) filters.classType = classType;
    if (runningStatus) filters.runningStatus = runningStatus;
    if (subject) filters.subject = { $regex: subject, $options: "i" };
    if (level) filters.level = level;
    if (language) filters.language = language;
    if (curriculum) filters.curriculum = curriculum;

    // Filter by isFull
    if (isFull === "true") {
        filters.$expr = { $gte: ["$enrolledStudents", "$maxStudents"] };
    } else if (isFull === "false") {
        filters.$expr = { $lt: ["$enrolledStudents", "$maxStudents"] };
    }

    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
        filters.price = {};
        if (minPrice !== undefined) filters.price.$gte = Number(minPrice);
        if (maxPrice !== undefined) filters.price.$lte = Number(maxPrice);
    }

    // Pipeline stages
    const pipeline: any[] = [{ $match: filters }];

    // Handle Sorting and Randomization with Preferences
    if (user && user.preferences) {
        const { subjects = [], curriculum: userCurriculums = [], languages = [], teacherGender } = user.preferences;

        // Create preference matching condition
        const preferenceMatch: any = {
            $or: [{ subject: { $in: subjects } }, { curriculum: { $in: userCurriculums } }, { language: { $in: languages } }],
        };

        if (teacherGender) {
            preferenceMatch.$or.push({ tutorGender: teacherGender.toUpperCase() });
        }

        // Add a field to mark if it matches preferences
        pipeline.push({
            $addFields: {
                isPreferred: {
                    $cond: {
                        if: preferenceMatch,
                        then: 1,
                        else: 0,
                    },
                },
                randomSort: { $rand: {} }, // Add random value for randomization
            },
        });

        // Sort by isPreferred (preferred first), then randomly
        pipeline.push({
            $sort: {
                isPreferred: -1,
                randomSort: 1,
            },
        });
    } else {
        // If not authenticated or no preferences, just randomize or use standard sort
        pipeline.push({
            $addFields: {
                randomSort: { $rand: {} },
            },
        });

        if (search) {
            // Text score sort if searching
            pipeline.push({
                $sort: { score: { $meta: "textScore" }, randomSort: 1 },
            });
        } else {
            // Default random sort
            pipeline.push({
                $sort: { randomSort: 1 },
            });
        }
    }

    // Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) });

    const result = await ClassModel.aggregate(pipeline);

    // Populate createdBy manually since aggregate doesn't support .populate()
    const populatedResult = await ClassModel.populate(result, {
        path: "createdBy",
        select: "name email profileImage",
    });

    // Add rating stats for each class
    const resultWithRatings = await Promise.all(
        populatedResult.map(async (cls: any) => {
            const ratingStats = await RatingModel.aggregate([
                { $match: { class: cls._id, isDeleted: false } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: "$rating" },
                        ratingCount: { $sum: 1 },
                    },
                },
            ]);

            cls.averageRating = ratingStats.length > 0 ? Number(ratingStats[0].averageRating.toFixed(1)) : 0;
            cls.ratingCount = ratingStats.length > 0 ? ratingStats[0].ratingCount : 0;
            return cls;
        }),
    );

    const total = await ClassModel.countDocuments(filters);
    const totalPages = Math.ceil(total / Number(limit));

    return {
        data: resultWithRatings,
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages,
        },
    };
};

const getMyClasses = async (userId: string, query: any = {}) => {
    const { page = 1, limit = 10, status, classType, runningStatus } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filters: any = { createdBy: new Types.ObjectId(userId), isDeleted: false };

    if (status) filters.status = status;
    if (classType) filters.classType = classType;
    if (runningStatus) filters.runningStatus = runningStatus;

    const result = await ClassModel.find(filters).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean();

    // Add rating stats for each class
    const resultWithRatings = await Promise.all(
        result.map(async (cls: any) => {
            const ratingStats = await RatingModel.aggregate([
                { $match: { class: cls._id, isDeleted: false } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: "$rating" },
                        ratingCount: { $sum: 1 },
                    },
                },
            ]);

            cls.averageRating = ratingStats.length > 0 ? Number(ratingStats[0].averageRating.toFixed(1)) : 0;
            cls.ratingCount = ratingStats.length > 0 ? ratingStats[0].ratingCount : 0;
            return cls;
        }),
    );

    const total = await ClassModel.countDocuments(filters);
    const totalPages = Math.ceil(total / Number(limit));

    return {
        data: resultWithRatings,
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages,
        },
    };
};

const getClassById = async (classId: string) => {
    const result = await ClassModel.findOne({ _id: classId, isDeleted: false, status: "APPROVED" }).populate("createdBy", "name email profileImage");
    if (!result) throw new ApiError(httpStatus.NOT_FOUND, "Class not found or not approved");

    // Get ratings for this specific class
    const ratingStats = await RatingModel.aggregate([
        { $match: { class: result._id, isDeleted: false } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: "$rating" },
                ratingCount: { $sum: 1 },
            },
        },
    ]);

    const formattedResult = result.toObject() as any;
    formattedResult.averageRating = ratingStats.length > 0 ? Number(ratingStats[0].averageRating.toFixed(1)) : 0;
    formattedResult.ratingCount = ratingStats.length > 0 ? ratingStats[0].ratingCount : 0;

    return formattedResult;
};

const getMyClassById = async (classId: string, userId: string) => {
    const cls = await ClassModel.findOne({ _id: classId, createdBy: userId, isDeleted: false }).populate("createdBy", "name email profileImage");
    if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found or you are not the creator");

    // Get enrolled students
    const enrollments = await ClassPaymentModel.find({
        classId: classId,
        status: "PAID",
    }).populate("student", "name email profileImage phone");

    // Get ratings for this specific class
    const ratingStats = await RatingModel.aggregate([
        { $match: { class: cls._id, isDeleted: false } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: "$rating" },
                ratingCount: { $sum: 1 },
            },
        },
    ]);

    const result = cls.toObject() as any;
    result.enrolledStudentsList = enrollments.map((e) => e.student);
    result.averageRating = ratingStats.length > 0 ? Number(ratingStats[0].averageRating.toFixed(1)) : 0;
    result.ratingCount = ratingStats.length > 0 ? ratingStats[0].ratingCount : 0;

    return result;
};

const updateClass = async (classId: string, userId: string, payload: any) => {
    const cls = await ClassModel.findOne({ _id: classId, isDeleted: false });
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
    const cls = await ClassModel.findOne({ _id: classId, isDeleted: false });
    if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found");

    if (cls.createdBy.toString() !== userId && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to delete this class");
    }

    cls.isDeleted = true;
    await cls.save();
    return;
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
    getMyClasses,
    getClassById,
    getMyClassById,
    updateClass,
    deleteClass,
    // submitForReview,
    setClassStatus,
};
