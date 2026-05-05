import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { RatingModel } from "./rating.model";

const createRating = async (payload: any) => {
    return RatingModel.create(payload);
};

const updateRating = async (ratingId: string, payload: any) => {
    const rating = await RatingModel.findOneAndUpdate({ _id: ratingId, isDeleted: false }, payload, {
        returnDocument: "after",
        runValidators: true,
    });
    if (!rating) throw new ApiError(404, "Rating not found");
    return rating;
};

const deleteRating = async (ratingId: string) => {
    const rating = await RatingModel.findOneAndUpdate({ _id: ratingId, isDeleted: false }, { $set: { isDeleted: true } }, { returnDocument: "after" });
    if (!rating) throw new ApiError(404, "Rating not found");
    return rating;
};

const getRatingById = async (ratingId: string) => {
    const rating = await RatingModel.findOne({ _id: ratingId, isDeleted: false }).populate("student", "name email profileImage").populate("tutor", "name profileImage").populate("class", "subject");

    if (!rating) throw new ApiError(404, "Rating not found");
    return rating;
};

const getRatings = async (filter: any = {}, options: any = {}) => {
    const { page = 1, limit = 10, skip = 0, sort } = options;
    const finalSkip = skip || (Number(page) - 1) * Number(limit);

    const query = RatingModel.find({ ...filter, isDeleted: false });

    if (sort) query.sort(sort);
    query.limit(Number(limit));
    query.skip(Number(finalSkip));

    const data = await query.populate("student", "name email profileImage").populate("tutor", "name profileImage").populate("class", "subject");
    const total = await RatingModel.countDocuments({ ...filter, isDeleted: false });
    const totalPages = Math.ceil(total / Number(limit));

    return {
        data,
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages,
        },
    };
};

const getAverageRatingForTutor = async (tutorId: Types.ObjectId) => {
    const result = await RatingModel.aggregate([{ $match: { tutor: tutorId, isDeleted: false } }, { $group: { _id: "$tutor", avgRating: { $avg: "$rating" } } }]);

    return result[0]?.avgRating || 0;
};

export const RatingService = {
    createRating,
    updateRating,
    deleteRating,
    getRatingById,
    getRatings,
    getAverageRatingForTutor,
};
