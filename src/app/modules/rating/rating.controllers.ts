import { Request, Response } from "express";
import { RatingService } from "./rating.service";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";

const createRating = catchAsync(async (req: Request, res: Response) => {
    const result = await RatingService.createRating({ ...req.body, student: req.user._id });

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Rating created successfully",
        data: result,
    });
});

const updateRating = catchAsync(async (req: Request, res: Response) => {
    const result = await RatingService.updateRating(req.params.id as string, req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Rating updated successfully",
        data: result,
    });
});

const deleteRating = catchAsync(async (req: Request, res: Response) => {
    await RatingService.deleteRating(req.params.id as string);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Rating deleted successfully",
        data: null,
    });
});

const getRatingById = catchAsync(async (req: Request, res: Response) => {
    const result = await RatingService.getRatingById(req.params.id as string);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Rating retrieved successfully",
        data: result,
    });
});

const getRatings = catchAsync(async (req: Request, res: Response) => {
    const filter: any = {};
    if (req.query.tutor) filter.tutor = req.query.tutor;
    if (req.query.class) filter.class = req.query.class;
    if (req.query.student) filter.student = req.query.student;

    const options: any = {};
    if (req.query.limit) options.limit = Number(req.query.limit);
    if (req.query.skip) options.skip = Number(req.query.skip);
    if (req.query.sort) options.sort = req.query.sort;

    const result = await RatingService.getRatings(filter, options);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Ratings retrieved successfully",
        data: result,
    });
});

export const RatingController = {
    createRating,
    updateRating,
    deleteRating,
    getRatingById,
    getRatings,
};
