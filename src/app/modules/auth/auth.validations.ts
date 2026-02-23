import { z } from "zod";

const locationSchema = z.object({
    fullAddress: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
});

export const registerSchema = z.object({
    name: z.string().min(2),

    email: z.string().email(),

    password: z.string().min(6),

    role: z.enum(["SUPER_ADMIN", "TEACHER", "STUDENT", "ADMIN", "GUEST"]).default("STUDENT"),

    phone: z.string().optional(),

    location: locationSchema.optional(),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const verifyEmailSchema = z.object({
    token: z.string(),
    email: z.string().email(),
});

export const resendVerificationSchema = z.object({
    email: z.string().email(),
});

export const updateProfileSchema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    location: locationSchema.optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(6),
});

export const updateEmailSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const resendEmailUpdateSchema = z.object({
    password: z.string(),
});
