// worker ts
// import { Queue } from "bullmq";
// import { redisConnection } from "./app/config/redis";

// export const slotCleanupQueue = new Queue("slot-cleanup", {
//     connection: redisConnection,
// });

import { connectDB } from "./app/config/redis";
import "./app/modules/slot/slot.worker";

const start = async () => {
    await connectDB();

    console.log("🚀 Worker process started...");
};

start();
