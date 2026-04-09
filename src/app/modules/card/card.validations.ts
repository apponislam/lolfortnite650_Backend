import { z } from "zod";

const initiateCardPaymentSchema = z.object({
    amount: z.number().positive("Amount must be positive"),
    currency: z.string().default("KWD").optional(),
    cardId: z.string().optional(),
    saveCard: z.boolean().optional(),
    teacherId: z.string().min(1, "Teacher ID is required"),
    classId: z.string().min(1, "Class ID is required"),
    classType: z
        .string()
        .min(1, "Class type is required")
        .refine((val) => ["HOURLY_CLASS", "CLASS"].includes(val), { message: "Invalid class type" }),
    slotId: z.string().optional(),
    messageId: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

const makeCardPaymentSchema = z.object({
    paymentId: z.string().min(1, "Payment ID is required"),
    cardId: z.string().min(1, "Card ID is required"),
    cvv: z.string().length(3, "CVV must be 3 digits"),
});

const saveCardSchema = z.object({
    token: z.string().min(1, "Token is required"),
    cardLastFour: z.string().length(4, "Card last four must be 4 digits"),
    cardBrand: z.string().min(1, "Card brand is required"),
    cardExpiryMonth: z.string().length(2, "Expiry month must be 2 digits"),
    cardExpiryYear: z.string().length(2, "Expiry year must be 2 digits"),
    cardHolderName: z.string().min(1, "Card holder name is required"),
    isDefault: z.boolean().optional(),
});

export const cardValidations = {
    initiateCardPaymentSchema,
    makeCardPaymentSchema,
    saveCardSchema,
};
