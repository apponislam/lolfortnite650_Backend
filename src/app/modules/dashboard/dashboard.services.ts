import { UserModel } from "../auth/auth.model";
import { ClassPaymentModel } from "../classpayments/classpayments.model";
import { WithdrawModel } from "../withdraw/withdraw.model";

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

export const dashboardServices = {
    getAdminDashboardStats,
    getMonthlyRegistrationStats,
    getUserRoleDistribution,
    getMonthlyPaymentStats,
    getMonthlyWithdrawStats,
};
