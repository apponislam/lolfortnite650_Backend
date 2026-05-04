import { Types } from "mongoose";
import { UserModel } from "../auth/auth.model";
import { ClassPaymentModel } from "../classpayments/classpayments.model";
import { RatingModel } from "../rating/rating.model";
import { HourlyClassModel } from "../hourlyclasses/hourlyclass.model";
import ApiError from "../../../errors/ApiError";
import httpStatus from "http-status";

const getAllTeachersWithStats = async (query: any) => {
    const { searchTerm, status, page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build filter
    const filter: any = { role: "TEACHER" };

    if (searchTerm) {
        filter.$or = [{ name: { $regex: searchTerm, $options: "i" } }, { email: { $regex: searchTerm, $options: "i" } }, { phone: { $regex: searchTerm, $options: "i" } }];
    }

    if (status) {
        filter.teacherApprovalStatus = status;
    }

    // Get teachers
    const teachers = await UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).select("-password");

    const total = await UserModel.countDocuments(filter);

    // Get stats for each teacher
    const teachersWithStats = await Promise.all(
        teachers.map(async (teacher) => {
            const teacherId = teacher._id;

            // 1. Total Sell Class (Count of PAID class payments)
            const totalSellClass = await ClassPaymentModel.countDocuments({
                teacher: teacherId,
                status: "PAID",
            });

            // 2. Total Earning (Sum of teacherFee from PAID class payments)
            const totalEarningResult = await ClassPaymentModel.aggregate([{ $match: { teacher: teacherId, status: "PAID" } }, { $group: { _id: null, total: { $sum: "$teacherFee" } } }]);
            const totalEarning = totalEarningResult.length > 0 ? totalEarningResult[0].total : 0;

            const teacherObj = teacher.toObject();
            return {
                ...teacherObj,
                totalSellClass,
                totalEarning,
            };
        }),
    );

    return {
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
        },
        data: teachersWithStats,
    };
};

const updateUserStatus = async (userId: string, status: string) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    if (user.role !== "TEACHER") {
        throw new ApiError(httpStatus.BAD_REQUEST, "User is not a teacher");
    }

    user.teacherApprovalStatus = status as any;
    if (status === "APPROVED") {
        user.approvalDate = new Date();
    }

    await user.save();
    return user;
};

const toggleUserActiveStatus = async (userId: string) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    user.isActive = !user.isActive;
    await user.save();
    return user;
};

const getAllStudentsWithStats = async (query: any) => {
    const { searchTerm, isActive, page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build filter
    const filter: any = { role: "STUDENT" };

    if (searchTerm) {
        filter.$or = [{ name: { $regex: searchTerm, $options: "i" } }, { email: { $regex: searchTerm, $options: "i" } }, { phone: { $regex: searchTerm, $options: "i" } }];
    }

    if (isActive !== undefined) {
        filter.isActive = isActive === "true";
    }

    // Get students
    const students = await UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).select("-password");

    const total = await UserModel.countDocuments(filter);

    // Get stats for each student
    const studentsWithStats = await Promise.all(
        students.map(async (student) => {
            const studentId = student._id;

            // 1. Total Purchase Class (Count of PAID class payments)
            const totalPurchaseClass = await ClassPaymentModel.countDocuments({
                student: studentId,
                status: "PAID",
            });

            // 2. Total Spend (Sum of amount from PAID class payments)
            const totalSpendResult = await ClassPaymentModel.aggregate([{ $match: { student: studentId, status: "PAID" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
            const totalSpend = totalSpendResult.length > 0 ? totalSpendResult[0].total : 0;

            const studentObj = student.toObject();
            return {
                ...studentObj,
                totalPurchaseClass,
                totalSpend,
            };
        }),
    );

    return {
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
        },
        data: studentsWithStats,
    };
};

const getSingleUser = async (userId: string) => {
    const user = await UserModel.findById(userId).select("-password");
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    const userObj: any = user.toObject();

    if (user.role === "TEACHER") {
        // 1. Total Sell Class (Count of PAID class payments)
        const totalSellClass = await ClassPaymentModel.countDocuments({
            teacher: userId,
            status: "PAID",
        });

        // 2. Total Earning (Sum of teacherFee from PAID class payments)
        const totalEarningResult = await ClassPaymentModel.aggregate([{ $match: { teacher: new Types.ObjectId(userId), status: "PAID" } }, { $group: { _id: null, total: { $sum: "$teacherFee" } } }]);
        userObj.totalEarning = totalEarningResult.length > 0 ? totalEarningResult[0].total : 0;
        userObj.totalSellClass = totalSellClass;

        // 3. Average Rating and Review Count
        const ratingStats = await RatingModel.aggregate([
            { $match: { tutor: new Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                    reviewCount: { $sum: 1 },
                },
            },
        ]);
        userObj.averageRating = ratingStats.length > 0 ? Number(ratingStats[0].averageRating.toFixed(1)) : 0;
        userObj.reviewCount = ratingStats.length > 0 ? ratingStats[0].reviewCount : 0;

        // 4. Unique Student Count
        const uniqueStudentsResult = await ClassPaymentModel.aggregate([{ $match: { teacher: new Types.ObjectId(userId), status: "PAID" } }, { $group: { _id: "$student" } }, { $count: "uniqueCount" }]);
        userObj.studentCount = uniqueStudentsResult.length > 0 ? uniqueStudentsResult[0].uniqueCount : 0;

        // 5. Hourly Class Info
        const hourlyClass = await HourlyClassModel.findOne({ createdBy: userId });
        userObj.hourlyClass = hourlyClass || null;
    }

    return userObj;
};

const updateUserCommission = async (userId: string, percentage: number) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    if (percentage < 0 || percentage > 100) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Percentage must be between 0 and 100");
    }

    user.percentage = percentage;
    await user.save();
    return user;
};

export const userServices = {
    getAllTeachersWithStats,
    getAllStudentsWithStats,
    updateUserStatus,
    toggleUserActiveStatus,
    getSingleUser,
    updateUserCommission,
};
