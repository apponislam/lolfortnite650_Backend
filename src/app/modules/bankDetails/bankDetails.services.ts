import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { BankAccountModel } from "./bankDetails.model";

const addBankAccount = async (userId: string, payload: any) => {
    // If this is the first account, make it default automatically
    const existingCount = await BankAccountModel.countDocuments({ userId });
    const isDefault = existingCount === 0 ? true : payload.isDefault ?? false;

    // If new account is being set as default, unset others
    if (isDefault) {
        await BankAccountModel.updateMany({ userId }, { $set: { isDefault: false } });
    }

    const account = await BankAccountModel.create({
        ...payload,
        userId: new Types.ObjectId(userId),
        isDefault,
        isVerified: false,
        addedAt: new Date(),
    });

    return account;
};

const getBankAccountsByUser = async (userId: string) => {
    const accounts = await BankAccountModel.find({ userId }).sort({ isDefault: -1, addedAt: -1 });
    return accounts;
};

const getBankAccountById = async (accountId: string, userId: string) => {
    const account = await BankAccountModel.findOne({ _id: accountId, userId });
    if (!account) throw new ApiError(httpStatus.NOT_FOUND, "Bank account not found");
    return account;
};

const updateBankAccount = async (accountId: string, userId: string, payload: any) => {
    const account = await BankAccountModel.findOne({ _id: accountId, userId });
    if (!account) throw new ApiError(httpStatus.NOT_FOUND, "Bank account not found");

    // Handle default switching
    if (payload.isDefault === true) {
        await BankAccountModel.updateMany({ userId }, { $set: { isDefault: false } });
    }

    Object.assign(account, payload);
    await account.save();
    return account;
};

const setDefaultAccount = async (accountId: string, userId: string) => {
    const account = await BankAccountModel.findOne({ _id: accountId, userId });
    if (!account) throw new ApiError(httpStatus.NOT_FOUND, "Bank account not found");

    await BankAccountModel.updateMany({ userId }, { $set: { isDefault: false } });
    account.isDefault = true;
    await account.save();
    return account;
};

const deleteBankAccount = async (accountId: string, userId: string) => {
    const account = await BankAccountModel.findOne({ _id: accountId, userId });
    if (!account) throw new ApiError(httpStatus.NOT_FOUND, "Bank account not found");

    const wasDefault = account.isDefault;
    await BankAccountModel.deleteOne({ _id: accountId });

    // If it was the default, promote the most recently added account
    if (wasDefault) {
        const next = await BankAccountModel.findOne({ userId }).sort({ addedAt: -1 });
        if (next) {
            next.isDefault = true;
            await next.save();
        }
    }
};

// Admin: verify a bank account
const verifyBankAccount = async (accountId: string) => {
    const account = await BankAccountModel.findByIdAndUpdate(
        accountId,
        { $set: { isVerified: true } },
        { new: true },
    );
    if (!account) throw new ApiError(httpStatus.NOT_FOUND, "Bank account not found");
    return account;
};

export const bankDetailsServices = {
    addBankAccount,
    getBankAccountsByUser,
    getBankAccountById,
    updateBankAccount,
    setDefaultAccount,
    deleteBankAccount,
    verifyBankAccount,
};
