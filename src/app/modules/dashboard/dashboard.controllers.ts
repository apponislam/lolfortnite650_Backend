import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { dashboardServices } from "./dashboard.services";

const getAdminDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getAdminDashboardStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Admin dashboard stats retrieved successfully",
        data: result,
    });
});

const getMonthlyRegistrationStats = catchAsync(async (req: Request, res: Response) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const result = await dashboardServices.getMonthlyRegistrationStats(year);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Monthly registration stats for ${year} retrieved successfully`,
        data: result,
    });
});

const getUserRoleDistribution = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getUserRoleDistribution();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "User role distribution retrieved successfully",
        data: result,
    });
});

const getMonthlyPaymentStats = catchAsync(async (req: Request, res: Response) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const result = await dashboardServices.getMonthlyPaymentStats(year);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Monthly payment stats for ${year} retrieved successfully`,
        data: result,
    });
});

const getMonthlyWithdrawStats = catchAsync(async (req: Request, res: Response) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const result = await dashboardServices.getMonthlyWithdrawStats(year);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Monthly withdraw stats for ${year} retrieved successfully`,
        data: result,
    });
});

export const dashboardControllers = {
    getAdminDashboardStats,
    getMonthlyRegistrationStats,
    getUserRoleDistribution,
    getMonthlyPaymentStats,
    getMonthlyWithdrawStats,
};
