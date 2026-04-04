import { Schema, model } from "mongoose";
import { IClassPayment } from "./classpayments.interface";

const classPaymentSchema = new Schema<IClassPayment>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        teacher: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        commission: {
            type: Number,
            required: true,
        },
        teacherFee: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            required: true,
            default: "KWD",
        },
        status: {
            type: String,
            enum: ["PENDING", "PAID", "FAILED", "CANCELED"],
            default: "PENDING",
            index: true,
        },
        invoiceId: String,
        paymentId: String,
        transactionId: String,
        paymentUrl: String,
        classType: {
            type: String,
            enum: ["HOURLY_CLASS", "CLASS"],
            required: true,
        },
        classId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        slotId: {
            type: Schema.Types.ObjectId,
            ref: "Slot",
        },
        messageId: {
            type: Schema.Types.ObjectId,
            ref: "Message",
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Single field indexes
classPaymentSchema.index({ transactionId: 1 });
classPaymentSchema.index({ classId: 1 });
classPaymentSchema.index({ createdAt: -1 });

// Compound indexes for student/teacher dashboards and history
classPaymentSchema.index({ student: 1, status: 1, createdAt: -1 });
classPaymentSchema.index({ teacher: 1, status: 1, createdAt: -1 });
classPaymentSchema.index({ student: 1, createdAt: -1 });
classPaymentSchema.index({ teacher: 1, createdAt: -1 });

// Unique/Search indexes for external references
classPaymentSchema.index({ invoiceId: 1 }, { unique: true, sparse: true });
classPaymentSchema.index({ paymentId: 1 }, { unique: true, sparse: true });

export const ClassPaymentModel = model<IClassPayment>("ClassPayment", classPaymentSchema);
