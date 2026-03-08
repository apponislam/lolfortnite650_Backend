import { z } from "zod";

const createMeetingSchema = z.object({
    body: z.object({
        topic: z.string().min(1, "Topic is required"),
        start_time: z.string().optional(),
        duration: z.number().min(1).optional(),
        timezone: z.string().optional(),
        agenda: z.string().optional(),
        password: z.string().optional(),
        settings: z
            .object({
                host_video: z.boolean().optional(),
                participant_video: z.boolean().optional(),
                join_before_host: z.boolean().optional(),
                mute_upon_entry: z.boolean().optional(),
                watermark: z.boolean().optional(),
                use_pmi: z.boolean().optional(),
                approval_type: z.number().optional(),
                audio: z.string().optional(),
                auto_recording: z.string().optional(),
            })
            .optional(),
    }),
});

export const zoomValidations = {
    createMeetingSchema,
};
