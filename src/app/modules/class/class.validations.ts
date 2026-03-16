import { z } from "zod";

export const createClassSchema = z.object({
    subject: z.string().min(1),
    level: z.string().optional(),
    language: z.string().optional(),
    curriculum: z.string().optional(),
    price: z.number().nonnegative(),
    tutorGender: z.enum(["MALE", "FEMALE"]),
    maxStudents: z.number().int().positive().optional(),
    whatsappGroupLink: z.string().url().optional(),
    description: z.string().optional(),
    youtubeVideoLink: z.string().url().optional(),
    classType: z.enum(["GROUP", "ONE_TO_ONE"]),
    images: z.array(z.string().url()).optional(),
});

export const updateClassSchema = z.object({
    subject: z.string().min(1).optional(),
    level: z.string().optional(),
    language: z.string().optional(),
    curriculum: z.string().optional(),
    price: z.number().nonnegative().optional(),
    tutorGender: z.enum(["MALE", "FEMALE"]).optional(),
    maxStudents: z.number().int().positive().optional(),
    whatsappGroupLink: z.string().url().optional(),
    description: z.string().optional(),
    youtubeVideoLink: z.string().url().optional(),
    classType: z.enum(["GROUP", "ONE_TO_ONE"]).optional(),
    images: z.array(z.string().url()).optional(),
});

export const setClassStatusSchema = z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
});
