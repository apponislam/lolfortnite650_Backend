import { Types } from "mongoose";
import { UserModel } from "../auth/auth.model";
import { ClassPaymentModel } from "../classpayments/classpayments.model";
import { WithdrawModel } from "../withdraw/withdraw.model";
import { ClassModel } from "../class/class.model";
import { RatingModel } from "../rating/rating.model";

const getAdminDashboardStats = async () => {
    // 1. Total Teacher Count
    const totalTeachers = await UserModel.countDocuments({ role: "TEACHER" });

    // 2. Total Student Count
    const totalStudents = await UserModel.countDocuments({ role: "STUDENT" });

    // 3. Total Earning (Sum of commissions from PAID class payments)
    const totalEarningResult = await ClassPaymentModel.aggregate([{ $match: { status: "PAID" } }, { $group: { _id: null, total: { $sum: "$commission" } } }]);
    const totalEarning = totalEarningResult.length > 0 ? totalEarningResult[0].total : 0;

    // 4. Total Payout (Sum of amount from PAID withdraw requests)
    const totalPayoutResult = await WithdrawModel.aggregate([{ $match: { status: "PAID" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
    const totalPayout = totalPayoutResult.length > 0 ? totalPayoutResult[0].total : 0;

    // 5. Total Class Revenue (Total amount paid by students)
    const totalRevenueResult = await ClassPaymentModel.aggregate([{ $match: { status: "PAID" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

    return {
        totalTeachers,
        totalStudents,
        totalEarning,
        totalPayout,
        totalRevenue,
    };
};

const getMonthlyRegistrationStats = async (year: number) => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const monthlyStats = await UserModel.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate },
                role: { $in: ["TEACHER", "STUDENT"] },
            },
        },
        {
            $group: {
                _id: {
                    month: { $month: "$createdAt" },
                    role: "$role",
                },
                count: { $sum: 1 },
            },
        },
        {
            $sort: { "_id.month": 1 },
        },
    ]);

    // Format data for all 12 months
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedData = monthNames.map((name, index) => {
        const monthNum = index + 1;
        const teacherStat = monthlyStats.find((s) => s._id.month === monthNum && s._id.role === "TEACHER");
        const studentStat = monthlyStats.find((s) => s._id.month === monthNum && s._id.role === "STUDENT");

        return {
            month: name,
            teachers: teacherStat ? teacherStat.count : 0,
            students: studentStat ? studentStat.count : 0,
            total: (teacherStat ? teacherStat.count : 0) + (studentStat ? studentStat.count : 0),
        };
    });

    return formattedData;
};

const getUserRoleDistribution = async () => {
    const stats = await UserModel.aggregate([
        {
            $match: {
                role: { $in: ["TEACHER", "STUDENT"] },
            },
        },
        {
            $group: {
                _id: "$role",
                count: { $sum: 1 },
            },
        },
    ]);

    const teachers = stats.find((s) => s._id === "TEACHER")?.count || 0;
    const students = stats.find((s) => s._id === "STUDENT")?.count || 0;
    const total = teachers + students;

    return {
        total,
        distribution: [
            { label: "Teachers", value: teachers, percentage: total > 0 ? ((teachers / total) * 100).toFixed(2) : 0 },
            { label: "Students", value: students, percentage: total > 0 ? ((students / total) * 100).toFixed(2) : 0 },
        ],
    };
};

const getMonthlyPaymentStats = async (year: number) => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const monthlyStats = await ClassPaymentModel.aggregate([
        {
            $match: {
                status: "PAID",
                createdAt: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: { $month: "$createdAt" },
                totalRevenue: { $sum: "$amount" },
                totalEarning: { $sum: "$commission" },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedData = monthNames.map((name, index) => {
        const monthNum = index + 1;
        const stat = monthlyStats.find((s) => s._id === monthNum);

        return {
            month: name,
            revenue: stat ? stat.totalRevenue : 0,
            earning: stat ? stat.totalEarning : 0,
            transactions: stat ? stat.count : 0,
        };
    });

    return formattedData;
};

const getMonthlyWithdrawStats = async (year: number) => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const monthlyStats = await WithdrawModel.aggregate([
        {
            $match: {
                status: "PAID",
                paidAt: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: { $month: "$paidAt" },
                totalPayout: { $sum: "$amount" },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedData = monthNames.map((name, index) => {
        const monthNum = index + 1;
        const stat = monthlyStats.find((s) => s._id === monthNum);

        return {
            month: name,
            payout: stat ? stat.totalPayout : 0,
            withdrawals: stat ? stat.count : 0,
        };
    });

    return formattedData;
};

const getTeacherDashboardStats = async (teacherId: string) => {
    // 1. Count Active Classes
    const activeClasses = await ClassModel.countDocuments({
        createdBy: new Types.ObjectId(teacherId),
        runningStatus: "RUNNING",
    });

    // 2. Count Total Students (Sum of enrolledStudents across all teacher's classes)
    const totalStudentsResult = await ClassModel.aggregate([{ $match: { createdBy: new Types.ObjectId(teacherId) } }, { $group: { _id: null, total: { $sum: "$enrolledStudents" } } }]);
    const totalStudents = totalStudentsResult.length > 0 ? totalStudentsResult[0].total : 0;

    return {
        activeClasses,
        totalStudents,
    };
};

const getTeacherRatingStats = async (teacherId: string) => {
    const stats = await RatingModel.aggregate([
        { $match: { tutor: new Types.ObjectId(teacherId) } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: "$rating" },
                totalRatings: { $sum: 1 },
                star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
                star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
                star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
                star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
                star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
            },
        },
    ]);

    if (stats.length === 0) {
        return {
            averageRating: 0,
            totalRatings: 0,
            distribution: [
                { star: 5, count: 0, percentage: 0 },
                { star: 4, count: 0, percentage: 0 },
                { star: 3, count: 0, percentage: 0 },
                { star: 2, count: 0, percentage: 0 },
                { star: 1, count: 0, percentage: 0 },
            ],
        };
    }

    const data = stats[0];
    const total = data.totalRatings;

    return {
        averageRating: Number(data.averageRating.toFixed(1)),
        totalRatings: total,
        distribution: [
            { star: 5, count: data.star5, percentage: total > 0 ? Number(((data.star5 / total) * 100).toFixed(1)) : 0 },
            { star: 4, count: data.star4, percentage: total > 0 ? Number(((data.star4 / total) * 100).toFixed(1)) : 0 },
            { star: 3, count: data.star3, percentage: total > 0 ? Number(((data.star3 / total) * 100).toFixed(1)) : 0 },
            { star: 2, count: data.star2, percentage: total > 0 ? Number(((data.star2 / total) * 100).toFixed(1)) : 0 },
            { star: 1, count: data.star1, percentage: total > 0 ? Number(((data.star1 / total) * 100).toFixed(1)) : 0 },
        ],
    };
};

export const dashboardServices = {
    getAdminDashboardStats,
    getMonthlyRegistrationStats,
    getUserRoleDistribution,
    getMonthlyPaymentStats,
    getMonthlyWithdrawStats,
    getTeacherDashboardStats,
    getTeacherRatingStats,
};
