import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis";

export const slotCleanupQueue = new Queue("slot-cleanup", {
    connection: redisConnection,
});
