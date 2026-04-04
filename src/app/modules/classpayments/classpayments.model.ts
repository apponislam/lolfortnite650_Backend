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

export const ClassPaymentModel = model<IClassPayment>("ClassPayment", classPaymentSchema);
