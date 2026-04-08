import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { WithdrawModel } from "./withdraw.model";
import { UserModel } from "../auth/auth.model";
import { BankAccountModel } from "../bankDetails/bankDetails.model";
import { WithdrawStatus } from "./withdraw.interface";

const createWithdrawRequest = async (teacherId: string, amount: number, bankDetailsId: string) => {
    const teacher = await UserModel.findById(teacherId);
    if (!teacher) {
        throw new ApiError(httpStatus.NOT_FOUND, "Teacher not found");
    }

    if (teacher.role !== "TEACHER") {
        throw new ApiError(httpStatus.FORBIDDEN, "Only teachers can request withdrawals");
    }

    // Check balance
    if (!teacher.balance || teacher.balance < amount) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Insufficient balance for withdrawal");
    }

    // Verify bank details belong to the teacher
    const bankAccount = await BankAccountModel.findOne({
        _id: bankDetailsId,
        userId: teacherId,
    });

    if (!bankAccount) {
        throw new ApiError(httpStatus.NOT_FOUND, "Bank account details not found or do not belong to you");
    }

    // Deduct balance immediately upon request
    await UserModel.findByIdAndUpdate(teacherId, {
        $inc: { balance: -amount },
    });

    // Create withdrawal request
    const result = await WithdrawModel.create({
        teacher: new Types.ObjectId(teacherId),
        amount,
        bankDetails: new Types.ObjectId(bankDetailsId),
        status: "PENDING",
    });

    return result;
};

const getWithdrawRequests = async (query: any) => {
    const { page = 1, limit = 10, status, teacherId } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filters: any = {};
    if (status) filters.status = status;
    if (teacherId) filters.teacher = new Types.ObjectId(teacherId);

    const result = await WithdrawModel.find(filters).populate("teacher", "name email profileImage balance").populate("bankDetails").sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

    const total = await WithdrawModel.countDocuments(filters);

    return {
        data: result,
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
        },
    };
};

const updateWithdrawStatus = async (withdrawId: string, status: WithdrawStatus, adminComment?: string) => {
    const withdrawRequest = await WithdrawModel.findById(withdrawId);
    if (!withdrawRequest) {
        throw new ApiError(httpStatus.NOT_FOUND, "Withdraw request not found");
    }

    if (withdrawRequest.status !== "PENDING") {
        throw new ApiError(httpStatus.BAD_REQUEST, `Withdraw request is already ${withdrawRequest.status}`);
    }

    const teacher = await UserModel.findById(withdrawRequest.teacher);
    if (!teacher) {
        throw new ApiError(httpStatus.NOT_FOUND, "Teacher associated with this request not found");
    }

    if (status === "PAID") {
        // Amount was already deducted during creation, so no need to deduct again
        withdrawRequest.status = "PAID";
        withdrawRequest.paidAt = new Date();
        withdrawRequest.adminComment = adminComment || "Payment has been processed";
    } else if (status === "REJECTED") {
        // Return money to teacher balance if rejected
        await UserModel.findByIdAndUpdate(withdrawRequest.teacher, {
            $inc: { balance: withdrawRequest.amount },
        });

        withdrawRequest.status = "REJECTED";
        withdrawRequest.adminComment = adminComment || "Request rejected. Balance returned to your account.";
    }

    await withdrawRequest.save();
    return withdrawRequest;
};

const cancelWithdrawRequest = async (withdrawId: string, teacherId: string) => {
    const withdrawRequest = await WithdrawModel.findOne({
        _id: withdrawId,
        teacher: teacherId,
    });

    if (!withdrawRequest) {
        throw new ApiError(httpStatus.NOT_FOUND, "Withdraw request not found");
    }

    if (withdrawRequest.status !== "PENDING") {
        throw new ApiError(httpStatus.BAD_REQUEST, "Only pending withdrawal requests can be cancelled");
    }

    // Return amount to teacher's balance since it was deducted at request time
    await UserModel.findByIdAndUpdate(teacherId, {
        $inc: { balance: withdrawRequest.amount },
    });

    withdrawRequest.status = "REJECTED";
    withdrawRequest.adminComment = "Cancelled by teacher. Balance returned to your account.";
    await withdrawRequest.save();
    return withdrawRequest;
};

export const withdrawServices = {
    createWithdrawRequest,
    getWithdrawRequests,
    updateWithdrawStatus,
    cancelWithdrawRequest,
};
