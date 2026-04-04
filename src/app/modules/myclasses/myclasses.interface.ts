import { Types } from "mongoose";

export type MyClassStatus = "PENDING" | "PAID" | "FAILED" | "CANCELED";
export type MyClassType = "HOURLY_CLASS" | "CLASS";

export interface IMyClass {
    student: Types.ObjectId;
    teacher: Types.ObjectId;
    amount: number;
    currency: string;
    status: MyClassStatus;

    // MyFatoorah related
    invoiceId?: string;
    paymentId?: string;
    transactionId?: string;
    paymentUrl?: string;

    // Class references
    classType: MyClassType;
    classId: Types.ObjectId; // Reference to Class or HourlyClass
    slotId?: Types.ObjectId; // Only for Hourly Class
    messageId?: Types.ObjectId; // Reference to the message (OFFER/REQUEST/ACCEPTED)

    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
