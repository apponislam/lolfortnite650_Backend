import { Types } from "mongoose";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELED";

export interface IPayment {
    user: Types.ObjectId;
    amount: number;
    currency: string;
    status: PaymentStatus;
    transactionId?: string; // Internal or external reference
    invoiceId?: string; // MyFatoorah Invoice ID
    paymentId?: string; // MyFatoorah Payment ID
    paymentMethod?: string; // Card, etc.
    paymentUrl?: string; // Url to redirect user
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
