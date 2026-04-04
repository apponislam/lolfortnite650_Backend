import { Schema, model } from "mongoose";
import { IWithdraw } from "./withdraw.interface";

const withdrawSchema = new Schema<IWithdraw>(
    {
        teacher: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: [true, "Withdraw amount is required"],
            min: [1, "Withdraw amount must be at least 1"],
        },
        status: {
            type: String,
            enum: ["PENDING", "PAID", "REJECTED"],
            default: "PENDING",
            index: true,
        },
        bankDetails: {
            type: Schema.Types.ObjectId,
            ref: "BankAccount",
            required: [true, "Bank account details are required"],
        },
        paidAt: {
            type: Date,
        },
        adminComment: {
            type: String,
            trim: true,
            default: "Your request is currently under review",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Indexes for faster lookups
withdrawSchema.index({ teacher: 1, status: 1 });
withdrawSchema.index({ createdAt: -1 });

export const WithdrawModel = model<IWithdraw>("Withdraw", withdrawSchema);
