import { z } from "zod";

const initiatePaymentSchema = z.object({
    amount: z.number().min(0.01, "Amount must be at least 0.01"),
    currency: z.string().optional().default("KWD"),
    metadata: z.any().optional(),
});

const makeRefundSchema = z.object({
    invoiceId: z.string().min(1, "invoiceId is required"),
    amount: z.number().min(0.01, "Amount must be at least 0.01"),
});

export const paymentValidations = {
    initiatePaymentSchema,
    makeRefundSchema,
};
