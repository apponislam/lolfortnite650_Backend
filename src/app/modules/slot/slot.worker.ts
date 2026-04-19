import { Worker } from "bullmq";
import { redisConnection } from "../../config/redis";
import { slotServices } from "./slot.services";

export const slotWorker = new Worker(
    "slot-cleanup",
    async (job) => {
        console.log("🧹 Worker running:", job.name);

        await slotServices.cleanupExpiredLocksAndBookings();

        console.log("✅ Cleanup done");
    },
    {
        connection: redisConnection,
        concurrency: 1,
    },
);

slotWorker.on("completed", (job) => {
    console.log("🎉 Job completed:", job?.id);
});

slotWorker.on("failed", (job, err) => {
    console.error("❌ Job failed:", job?.id, err.message);
});
