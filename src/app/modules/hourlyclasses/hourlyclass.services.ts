import { Types } from "mongoose";
import { HourlyClassModel } from "./hourlyclass.model";
import { HourlyClass } from "./hourlyclass.interface";
import ApiError from "../../../errors/ApiError";
import httpStatus from "http-status";
import { RatingModel } from "../rating/rating.model";

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
        returnDocument: "after",
        upsert: true,
        runValidators: true,
    });
    return result;
};

/**
 * Get all hourly classes (with filters, search, and pagination)
 */
const getAllHourlyClasses = async (query: any, user?: any) => {
    const { page = 1, limit = 10, subjects, curriculum, language, search, minPrice, maxPrice, sortBy = "createdAt", sortOrder = "desc", tutorGender } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filters: any = {};

    // Text Search
    if (search) {
        filters.$or = [{ subjects: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }, { curriculum: { $regex: search, $options: "i" } }];
    }

    // Exact or partial matches
    if (subjects) {
        const subjectArray = Array.isArray(subjects) ? subjects : [subjects];
        filters.subjects = { $in: subjectArray.map((s: string) => new RegExp(s, "i")) };
    }

    if (curriculum) {
        const curriculumArray = Array.isArray(curriculum) ? curriculum : [curriculum];
        filters.curriculum = { $in: curriculumArray.map((c: string) => new RegExp(c, "i")) };
    }

    if (language) {
        const languageArray = Array.isArray(language) ? language : [language];
        filters.language = { $in: languageArray.map((l: string) => new RegExp(l, "i")) };
    }

    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
        filters.pricePerHour = {};
        if (minPrice !== undefined) filters.pricePerHour.$gte = Number(minPrice);
        if (maxPrice !== undefined) filters.pricePerHour.$lte = Number(maxPrice);
    }

    // Pipeline stages
    const pipeline: any[] = [{ $match: filters }];

    // If tutorGender filter is requested, we need the lookup
    if (tutorGender) {
        pipeline.push({
            $lookup: {
                from: "users",
                localField: "createdBy",
                foreignField: "_id",
                as: "tutorDetails",
            },
        });
        pipeline.push({ $unwind: "$tutorDetails" });

        const genderArray = Array.isArray(tutorGender) ? tutorGender : [tutorGender];
        pipeline.push({ $match: { "tutorDetails.gender": { $in: genderArray.map((g: string) => g.toUpperCase()) } } });
    }

    // Handle Sorting and Randomization with Preferences
    if (user && user.preferences) {
        const { subjects: userSubjects = [], languages: userLanguages = [], teacherGender } = user.preferences;

        // If not already populated for tutorGender filter
        if (!tutorGender) {
            pipeline.push({
                $lookup: {
                    from: "users", // the user collection name
                    localField: "createdBy",
                    foreignField: "_id",
                    as: "tutorDetails",
                },
            });
            pipeline.push({ $unwind: "$tutorDetails" });
        }

        // Create preference matching condition
        const preferenceMatch: any[] = [];
        if (userSubjects.length > 0) preferenceMatch.push({ subjects: { $in: userSubjects } });
        if (userLanguages.length > 0) preferenceMatch.push({ language: { $in: userLanguages } });

        if (teacherGender) {
            preferenceMatch.push({ "tutorDetails.gender": teacherGender.toUpperCase() });
        }

        // Add a field to mark if it matches preferences
        pipeline.push({
            $addFields: {
                isPreferred: {
                    $cond: {
                        if: preferenceMatch.length > 0 ? { $or: preferenceMatch } : false,
                        then: 1,
                        else: 0,
                    },
                },
                randomSort: { $rand: {} },
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

        pipeline.push({
            $sort: { randomSort: 1 },
        });
    }

    // Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) });

    const result = await HourlyClassModel.aggregate(pipeline);

    // Clean up or re-populate if necessary (since we used lookup)
    const formattedResult = await Promise.all(
        result.map(async (item) => {
            // Get ratings for this specific class
            const ratingStats = await RatingModel.aggregate([
                { $match: { class: item._id, isDeleted: false } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: "$rating" },
                        ratingCount: { $sum: 1 },
                    },
                },
            ]);

            item.averageRating = ratingStats.length > 0 ? Number(ratingStats[0].averageRating.toFixed(1)) : 0;
            item.ratingCount = ratingStats.length > 0 ? ratingStats[0].ratingCount : 0;

            if (item.tutorDetails) {
                item.createdBy = {
                    _id: item.tutorDetails._id,
                    name: item.tutorDetails.name,
                    email: item.tutorDetails.email,
                    profileImage: item.tutorDetails.profileImage,
                    gender: item.tutorDetails.gender,
                };
                delete item.tutorDetails;
            }
            return item;
        }),
    );

    // If tutorDetails wasn't joined (non-auth user), populate manually
    if (!user || !user.preferences) {
        if (!tutorGender) {
            await HourlyClassModel.populate(formattedResult, {
                path: "createdBy",
                select: "name email profileImage gender",
            });
        }
    }

    const total = await HourlyClassModel.countDocuments(filters);
    const totalPages = Math.ceil(total / Number(limit));

    return {
        data: formattedResult,
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
    const result = await HourlyClassModel.findOne({ createdBy: new Types.ObjectId(userId) }).populate("createdBy", "name email profileImage gender");
    if (!result) return null;

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

/**
 * Get single hourly class by ID
 */
const getHourlyClassById = async (id: string) => {
    const result = await HourlyClassModel.findById(id).populate("createdBy", "name email profileImage gender");
    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, "Hourly class not found");
    }

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

/**
 * Get hourly class by teacher ID
 */
const getHourlyClassByTeacherId = async (teacherId: string) => {
    const result = await HourlyClassModel.findOne({ createdBy: new Types.ObjectId(teacherId) }).populate("createdBy", "name email profileImage gender");
    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, "Hourly class not found for this teacher");
    }

    // Get ratings for this specific class
    const ratingStats = await RatingModel.aggregate([
        { $match: { class: result._id } },
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

export const hourlyClassServices = {
    createOrUpdateHourlyClass,
    getAllHourlyClasses,
    getMyHourlyClass,
    getHourlyClassById,
    getHourlyClassByTeacherId,
};
