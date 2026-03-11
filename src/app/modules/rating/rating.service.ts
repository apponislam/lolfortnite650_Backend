import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { RatingModel } from "./rating.model";

const createRating = async (payload: any) => {
    return RatingModel.create(payload);
};

const updateRating = async (ratingId: string, payload: any) => {
    const rating = await RatingModel.findByIdAndUpdate(ratingId, payload, {
        new: true,
        runValidators: true,
    });
    if (!rating) throw new ApiError(404, "Rating not found");
    return rating;
};

const deleteRating = async (ratingId: string) => {
    const rating = await RatingModel.findByIdAndDelete(ratingId);
    if (!rating) throw new ApiError(404, "Rating not found");
    return rating;
};

const getRatingById = async (ratingId: string) => {
    const rating = await RatingModel.findById(ratingId).populate("student", "name email").populate("tutor", "name").populate("class", "subject");

    if (!rating) throw new ApiError(404, "Rating not found");
    return rating;
};

const getRatings = async (filter: any = {}, options: any = {}) => {
    const query = RatingModel.find(filter);

    if (options.sort) query.sort(options.sort);
    if (options.limit) query.limit(options.limit);
    if (options.skip) query.skip(options.skip);

    return query.populate("student", "name email").populate("tutor", "name").populate("class", "subject");
};

const getAverageRatingForTutor = async (tutorId: Types.ObjectId) => {
    const result = await RatingModel.aggregate([{ $match: { tutor: tutorId } }, { $group: { _id: "$tutor", avgRating: { $avg: "$rating" } } }]);

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
