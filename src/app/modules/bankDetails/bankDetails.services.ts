import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { BankAccountModel } from "./bankDetails.model";

const addBankAccount = async (userId: string, payload: any) => {
    // enforce maximum of 5 accounts per user (not counting deleted)
    const existingCount = await BankAccountModel.countDocuments({ userId, isDeleted: false });
    if (existingCount >= 5) {
        throw new ApiError(httpStatus.BAD_REQUEST, "You can only have up to 5 bank accounts");
    }

    // If this is the first non-deleted account, make it default automatically
    const isDefault = existingCount === 0 ? true : (payload.isDefault ?? false);

    // If new account is being set as default, unset others (only non-deleted)
    if (isDefault) {
        await BankAccountModel.updateMany({ userId, isDeleted: false }, { $set: { isDefault: false } });
    }

    const account = await BankAccountModel.create({
        ...payload,
        userId: new Types.ObjectId(userId),
        isDefault,
        isVerified: false,
        isDeleted: false,
    });

    return account;
};

const getBankAccountsByUser = async (userId: string) => {
    const accounts = await BankAccountModel.find({ userId, isDeleted: false }).sort({ isDefault: -1, createdAt: -1 });
    return accounts;
};

const getBankAccountById = async (accountId: string, userId: string) => {
    const account = await BankAccountModel.findOne({ _id: accountId, userId, isDeleted: false });
    if (!account) throw new ApiError(httpStatus.NOT_FOUND, "Bank account not found");
    return account;
};

const updateBankAccount = async (accountId: string, userId: string, payload: any) => {
    const account = await BankAccountModel.findOne({ _id: accountId, userId, isDeleted: false });
    if (!account) throw new ApiError(httpStatus.NOT_FOUND, "Bank account not found");

    // Handle default switching
    if (payload.isDefault === true) {
        await BankAccountModel.updateMany({ userId, isDeleted: false }, { $set: { isDefault: false } });
    }

    // only allow update of allowed fields; payload may contain new address props too
    Object.assign(account, payload);
    await account.save();
    return account;
};

const setDefaultAccount = async (accountId: string, userId: string) => {
    const account = await BankAccountModel.findOne({ _id: accountId, userId, isDeleted: false });
    if (!account) throw new ApiError(httpStatus.NOT_FOUND, "Bank account not found");

    await BankAccountModel.updateMany({ userId, isDeleted: false }, { $set: { isDefault: false } });
    account.isDefault = true;
    await account.save();
    return account;
};

const deleteBankAccount = async (accountId: string, userId: string) => {
    const account = await BankAccountModel.findOne({ _id: accountId, userId, isDeleted: false });
    if (!account) throw new ApiError(httpStatus.NOT_FOUND, "Bank account not found");

    const wasDefault = account.isDefault;

    // Soft delete
    account.isDeleted = true;
    account.isDefault = false;
    await account.save();

    // If it was the default, promote the most recently added non-deleted account
    if (wasDefault) {
        const next = await BankAccountModel.findOne({ userId, isDeleted: false }).sort({ createdAt: -1 });
        if (next) {
            next.isDefault = true;
            await next.save();
        }
    }
};

// Admin: verify a bank account
const verifyBankAccount = async (accountId: string) => {
    const account = await BankAccountModel.findOneAndUpdate({ _id: accountId, isDeleted: false }, { $set: { isVerified: true } }, { returnDocument: "after" });
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
