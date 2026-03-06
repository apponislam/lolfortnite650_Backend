import { z } from "zod";

const initiatePaymentSchema = z.object({
    body: z.object({
        amount: z.number().min(0.01, "Amount must be at least 0.01"),
        currency: z.string().optional().default("KWD"),
        metadata: z.any().optional(),
    }),
});

export const paymentValidations = {
    initiatePaymentSchema,
};
