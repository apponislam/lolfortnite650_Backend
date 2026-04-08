import { Types } from "mongoose";
import { UserModel } from "../auth/auth.model";
import { ClassPaymentModel } from "../classpayments/classpayments.model";
import { WithdrawModel } from "../withdraw/withdraw.model";
import { ClassModel } from "../class/class.model";
import { RatingModel } from "../rating/rating.model";
import { Slot } from "../slot/slot.model";

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

const getTeacherOverviewStats = async (teacherId: string) => {
    // 1. Get Teacher details (Balance, Commission Percentage, Radius)
    const teacher = await UserModel.findById(teacherId).select("balance percentage availabilityLocation");

    // 2. Count Total Bookings (Paid class payments)
    const totalBookings = await ClassPaymentModel.countDocuments({
        teacher: new Types.ObjectId(teacherId),
        status: "PAID",
    });

    // 3. Count Upcoming Sessions (Only HOURLY_CLASS, PAID status, and slot date is today or future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingSessionsResult = await ClassPaymentModel.aggregate([
        {
            $match: {
                teacher: new Types.ObjectId(teacherId),
                status: "PAID",
                classType: "HOURLY_CLASS",
            },
        },
        {
            $lookup: {
                from: "slots",
                localField: "slotId",
                foreignField: "_id",
                as: "slotDetails",
            },
        },
        { $unwind: "$slotDetails" },
        {
            $match: {
                "slotDetails.date": { $gte: today },
            },
        },
        {
            $count: "upcomingCount",
        },
    ]);

    const upcomingSessions = upcomingSessionsResult.length > 0 ? upcomingSessionsResult[0].upcomingCount : 0;

    // 4. Average Rating and Rating Count
    const ratingStats = await RatingModel.aggregate([
        { $match: { tutor: new Types.ObjectId(teacherId) } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: "$rating" },
                ratingCount: { $sum: 1 },
            },
        },
    ]);

    const averageRating = ratingStats.length > 0 ? Number(ratingStats[0].averageRating.toFixed(1)) : 0;
    const ratingCount = ratingStats.length > 0 ? ratingStats[0].ratingCount : 0.0;

    return {
        netEarnings: teacher?.balance || 0,
        commissionPercentage: teacher?.percentage || 20,
        totalBookings,
        upcomingSessions,
        averageRating,
        ratingCount,
        radius: teacher?.availabilityLocation?.radiusKm || 0,
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

const getTeacherWeeklyEarningStats = async (teacherId: string, startDate?: string) => {
    let start = startDate ? new Date(startDate) : new Date();
    // Adjust to the beginning of the week (Sunday)
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const weeklyStats = await ClassPaymentModel.aggregate([
        {
            $match: {
                teacher: new Types.ObjectId(teacherId),
                status: "PAID",
                createdAt: { $gte: start, $lte: end },
            },
        },
        {
            $group: {
                _id: { $dayOfWeek: "$createdAt" },
                totalEarning: { $sum: "$teacherFee" },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const formattedData = days.map((name, index) => {
        const dayNum = index + 1; // MongoDB $dayOfWeek returns 1 (Sun) to 7 (Sat)
        const stat = weeklyStats.find((s) => s._id === dayNum);

        return {
            day: name,
            earning: stat ? stat.totalEarning : 0,
        };
    });

    return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        earnings: formattedData,
    };
};

const getTeacherFinancialStats = async (teacherId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Total Revenue (Sum of teacherFee from all PAID class payments)
    const totalRevenueResult = await ClassPaymentModel.aggregate([{ $match: { teacher: new Types.ObjectId(teacherId), status: "PAID" } }, { $group: { _id: null, total: { $sum: "$teacherFee" } } }]);
    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

    // 2. Current Balance (From User model)
    const user = await UserModel.findById(teacherId).select("balance");
    const currentBalance = user?.balance || 0;

    // 3. Total Withdrawals (Sum of amount from PAID withdraw requests)
    const totalWithdrawalsResult = await WithdrawModel.aggregate([{ $match: { teacher: new Types.ObjectId(teacherId), status: "PAID" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
    const totalWithdrawals = totalWithdrawalsResult.length > 0 ? totalWithdrawalsResult[0].total : 0;

    // 4. Today Revenue (Sum of teacherFee from PAID class payments today)
    const todayRevenueResult = await ClassPaymentModel.aggregate([
        {
            $match: {
                teacher: new Types.ObjectId(teacherId),
                status: "PAID",
                createdAt: { $gte: today },
            },
        },
        { $group: { _id: null, total: { $sum: "$teacherFee" } } },
    ]);
    const todayRevenue = todayRevenueResult.length > 0 ? todayRevenueResult[0].total : 0;

    return {
        totalRevenue,
        currentBalance,
        totalWithdrawals,
        todayRevenue,
    };
};

export const dashboardServices = {
    getAdminDashboardStats,
    getMonthlyRegistrationStats,
    getUserRoleDistribution,
    getMonthlyPaymentStats,
    getMonthlyWithdrawStats,
    getTeacherDashboardStats,
    getTeacherOverviewStats,
    getTeacherRatingStats,
    getTeacherWeeklyEarningStats,
    getTeacherFinancialStats,
};
