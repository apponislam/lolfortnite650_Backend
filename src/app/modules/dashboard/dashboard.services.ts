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

export const dashboardServices = {
    getAdminDashboardStats,
};
