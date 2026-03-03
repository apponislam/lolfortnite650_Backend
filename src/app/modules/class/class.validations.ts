import { z } from "zod";

export const createClassSchema = z.object({
    subject: z.string().min(1),
    level: z.string().optional(),
    language: z.string().optional(),
    curriculum: z.string().optional(),
    price: z.number().nonnegative(),
    tutorGender: z.enum(["MALE", "FEMALE", "ANY"]).optional(),
    maxStudents: z.number().int().positive().optional(),
    whatsappGroupLink: z.string().url().optional(),
    description: z.string().optional(),
    youtubeVideoLink: z.string().url().optional(),
    classType: z.enum(["GROUP", "ONE_TO_ONE"]),
    thumbnailUrl: z.string().url().optional(),
});

export const updateClassSchema = z.object({
    subject: z.string().min(1).optional(),
    level: z.string().optional(),
    language: z.string().optional(),
    curriculum: z.string().optional(),
    price: z.number().nonnegative().optional(),
    tutorGender: z.enum(["MALE", "FEMALE", "ANY"]).optional(),
    maxStudents: z.number().int().positive().optional(),
    whatsappGroupLink: z.string().url().optional(),
    description: z.string().optional(),
    youtubeVideoLink: z.string().url().optional(),
    classType: z.enum(["GROUP", "ONE_TO_ONE"]).optional(),
    thumbnailUrl: z.string().url().optional(),
});

export const setClassStatusSchema = z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
});
