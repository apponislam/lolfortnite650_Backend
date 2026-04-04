import { UserModel } from "../auth/auth.model";
import { ClassPaymentModel } from "../classpayments/classpayments.model";
import { WithdrawModel } from "../withdraw/withdraw.model";

const getAdminDashboardStats = async () => {
    // 1. Total Teacher Count
    const totalTeachers = await UserModel.countDocuments({ role: "TEACHER" });

    // 2. Total Student Count
    const totalStudents = await UserModel.countDocuments({ role: "STUDENT" });

    // 3. Total Earning (Sum of commissions from PAID class payments)
    const totalEarningResult = await ClassPaymentModel.aggregate([
        { $match: { status: "PAID" } },
        { $group: { _id: null, total: { $sum: "$commission" } } },
    ]);
    const totalEarning = totalEarningResult.length > 0 ? totalEarningResult[0].total : 0;

    // 4. Total Payout (Sum of amount from PAID withdraw requests)
    const totalPayoutResult = await WithdrawModel.aggregate([
        { $match: { status: "PAID" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalPayout = totalPayoutResult.length > 0 ? totalPayoutResult[0].total : 0;

    // 5. Total Class Revenue (Total amount paid by students)
    const totalRevenueResult = await ClassPaymentModel.aggregate([
        { $match: { status: "PAID" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
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

export const dashboardServices = {
    getAdminDashboardStats,
    getMonthlyRegistrationStats,
};
