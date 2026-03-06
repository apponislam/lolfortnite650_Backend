import { z } from "zod";

const initiateCardPaymentSchema = z.object({
    amount: z.number().positive("Amount must be positive"),
    currency: z.string().default("KWD").optional(),
    cardId: z.string().optional(),
    saveCard: z.boolean().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

const makeCardPaymentSchema = z.object({
    paymentId: z.string(),
    cardId: z.string(),
    cvv: z.string().length(3, "CVV must be 3 digits"),
});

const saveCardSchema = z.object({
    token: z.string(),
    cardLastFour: z.string().length(4),
    cardBrand: z.string(),
    cardExpiryMonth: z.string().length(2),
    cardExpiryYear: z.string().length(2),
    cardHolderName: z.string(),
    isDefault: z.boolean().optional(),
});

export const cardValidations = {
    initiateCardPaymentSchema,
    makeCardPaymentSchema,
    saveCardSchema,
};
