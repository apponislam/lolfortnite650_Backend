import mongoose, { Schema, Document } from "mongoose";
import { IBankAccount } from "./bankDetails.interface";

export interface BankAccountDocument extends Omit<IBankAccount, "_id">, Document {}

const BankAccountSchema = new Schema<BankAccountDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

        accountHolderName: { type: String, required: true, trim: true },
        bankName: { type: String, required: true, trim: true },
        accountNumber: { type: String, required: true, trim: true },

        routingNumber: { type: String, trim: true },
        branchName: { type: String, trim: true },

        swiftCode: { type: String, trim: true },
        iban: { type: String, trim: true },
        country: { type: String, trim: true },

        bankAddress: { type: String, trim: true },
        beneficiaryAddress: { type: String, trim: true },

        isVerified: { type: Boolean, default: false },
        isDefault: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

BankAccountSchema.index({ userId: 1 });
BankAccountSchema.index({ userId: 1, isDefault: 1 });

export const BankAccountModel = mongoose.model<BankAccountDocument>("BankAccount", BankAccountSchema);
