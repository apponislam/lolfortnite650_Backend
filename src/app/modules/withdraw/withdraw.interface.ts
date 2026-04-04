import { Types } from "mongoose";

export type WithdrawStatus = "PENDING" | "PAID" | "REJECTED";

export interface IWithdraw {
    teacher: Types.ObjectId;
    amount: number;
    status: WithdrawStatus;
    bankDetails: Types.ObjectId; // Reference to IBankAccount
    paidAt?: Date;
    adminComment?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
