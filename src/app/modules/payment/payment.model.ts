import { Schema, model } from "mongoose";
import { IPayment } from "./payment.interface";

const paymentSchema = new Schema<IPayment>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
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
        },
        transactionId: {
            type: String,
        },
        invoiceId: {
            type: String,
        },
        paymentId: {
            type: String,
        },
        paymentMethod: {
            type: String, // e.g., 'Card'
        },
        paymentUrl: {
            type: String,
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

export const PaymentModel = model<IPayment>("Payment", paymentSchema);
