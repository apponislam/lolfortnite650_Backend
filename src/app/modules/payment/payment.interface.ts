import { Types } from "mongoose";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELED";

export interface IPayment {
    user: Types.ObjectId;
    amount: number;
    currency: string;
    status: PaymentStatus;
    transactionId?: string;
    invoiceId?: string;
    paymentId?: string;
    paymentMethod?: string;
    paymentUrl?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
