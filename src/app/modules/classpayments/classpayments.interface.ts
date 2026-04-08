import { Types } from "mongoose";

export type ClassPaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELED";
export type ClassPaymentType = "HOURLY_CLASS" | "CLASS";
export type ClassDetailType = "GROUP" | "ONE_TO_ONE";

export interface IClassPayment {
    student: Types.ObjectId;
    teacher: Types.ObjectId;
    amount: number;
    commission: number;
    teacherFee: number;
    currency: string;
    status: ClassPaymentStatus;

    // MyFatoorah related
    invoiceId?: string;
    paymentId?: string;
    transactionId?: string;
    paymentUrl?: string;

    // Class references
    classType: ClassPaymentType;
    classDetailType?: ClassDetailType; // For CLASS type: GROUP or ONE_TO_ONE
    classId: Types.ObjectId; // Reference to Class or HourlyClass
    slotId?: Types.ObjectId; // Only for Hourly Class
    messageId?: Types.ObjectId; // Reference to the message (OFFER/REQUEST/ACCEPTED)

    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
