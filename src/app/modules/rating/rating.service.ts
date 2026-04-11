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
    const query = RatingModel.find({ ...filter, isDeleted: false });

    if (options.sort) query.sort(options.sort);
    if (options.limit) query.limit(options.limit);
    if (options.skip) query.skip(options.skip);

    return query.populate("student", "name email profileImage").populate("tutor", "name profileImage").populate("class", "subject");
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
