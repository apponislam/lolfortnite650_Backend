import cron from "node-cron";
import pLimit from "p-limit";
import { TeacherAvailability } from "../availability/availability.model";
import { SlotStatus } from "./slot.interface";
import { Slot } from "./slot.model";
import { slotServices } from "./slot.services";
import { slotCleanupQueue } from "./slot.queue";

export class SlotJobs {
    private static isInitialized = false;

    // 🔒 Locks to prevent overlapping jobs
    private static isGeneratingSlots = false;
    private static isCleaning = false;

    static initializeAllJobs() {
        if (this.isInitialized) return;

        console.log("🚀 Starting calendar automation...");

        // this.startCleanupLoop();

        // 1. DAILY at 2 AM
        cron.schedule(
            "0 2 * * *",
            async () => {
                if (this.isGeneratingSlots) {
                    console.log("⏳ Slot generation already running, skipping...");
                    return;
                }

                this.isGeneratingSlots = true;
                try {
                    console.log("📅 Running daily slot generation...");
                    await this.generateSlotsForAllTeachers();
                } finally {
                    this.isGeneratingSlots = false;
                }
            },
            { timezone: "Asia/Dhaka" },
        );

        // 2. EVERY 5 MINUTES
        // cron.schedule(
        //     "*/5 * * * *",
        //     async () => {
        //         try {
        //             await this.cleanupExpiredLocks();
        //         } catch (err) {
        //             console.error("❌ Lock cleanup error:", err);
        //         }
        //     },
        //     { timezone: "Asia/Dhaka" },
        // );

        // 3. EVERY HOUR
        // cron.schedule(
        //     "0 * * * *",
        //     async () => {
        //         if (this.isCleaning) {
        //             console.log("⏳ Cleanup already running, skipping...");
        //             return;
        //         }

        //         this.isCleaning = true;
        //         console.log("🧹 Running hourly cleanup...");

        //         try {
        //             await slotServices.cleanupExpiredLocksAndBookings();
        //         } catch (err) {
        //             console.error("❌ Cleanup failed:", err);
        //         } finally {
        //             this.isCleaning = false;
        //         }
        //     },
        //     { timezone: "Asia/Dhaka" },
        // );

        cron.schedule("0 * * * *", async () => {
            console.log("📩 Adding cleanup job...");

            await slotCleanupQueue.add(
                "cleanup-expired-locks",
                {
                    triggeredAt: new Date(),
                },
                {
                    removeOnComplete: true,
                },
            );
        });

        // 4. DAILY at 3 AM
        cron.schedule(
            "0 3 * * *",
            async () => {
                if (this.isGeneratingSlots) {
                    console.log("⏳ Slot generation in progress, skipping 3AM job...");
                    return;
                }

                this.isGeneratingSlots = true;

                try {
                    console.log("🗑️ Cleaning old slots...");
                    await this.cleanupOldSlots();

                    console.log("📅 Generating slots for +1 day...");
                    await this.generateSlotsForAllTeachers(1); // only 1 day
                } catch (err) {
                    console.error("❌ 3AM job failed:", err);
                } finally {
                    this.isGeneratingSlots = false;
                }
            },
            { timezone: "Asia/Dhaka" },
        );

        // 5. STARTUP SAFE RUN (non-blocking)
        setTimeout(() => {
            console.log("🚀 Startup jobs queued...");

            this.generateSlotsForAllTeachers().catch(console.error);
            this.cleanupOldSlots().catch(console.error);
            slotServices.cleanupExpiredLocksAndBookings().catch(console.error);
        }, 10000);

        this.isInitialized = true;

        console.log("✅ Calendar automation running:");
        console.log("   - Daily slot generation at 2 AM");
        console.log("   - Lock cleanup every 5 minutes");
        console.log("   - Full cleanup every hour");
        console.log("   - Old slot cleanup at 3 AM");
    }

    // 🧹 CLEAN OLD SLOTS
    private static async cleanupOldSlots() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const result = await Slot.deleteMany({
                date: { $lt: today },
                status: {
                    $in: [SlotStatus.AVAILABLE, SlotStatus.LOCKED, SlotStatus.UNAVAILABLE],
                },
            });

            console.log(`🗑️ Deleted ${result.deletedCount} old slots`);
        } catch (error) {
            console.error("❌ Failed to cleanup old slots:", error);
        }
    }

    // ⚡ OPTIMIZED SLOT GENERATION
    private static async generateSlotsForAllTeachers(days = 30) {
        try {
            const teachers = await TeacherAvailability.find({}).distinct("teacher");

            if (!teachers.length) {
                console.log("No teachers found");
                return;
            }

            const limit = pLimit(5); // 🔥 control concurrency (VERY IMPORTANT)

            let totalGenerated = 0;
            let totalSkipped = 0;

            const results = await Promise.all(
                teachers.map((teacherId) =>
                    limit(async () => {
                        try {
                            const res = await slotServices.generateSlotsForTeacher(teacherId.toString(), days);

                            console.log(`✓ ${teacherId}: ${res.generated} new, ${res.skipped} skipped`);

                            return res;
                        } catch (err) {
                            console.error(`✗ Failed for ${teacherId}:`, err);
                            return { generated: 0, skipped: 0 };
                        }
                    }),
                ),
            );

            for (const r of results) {
                totalGenerated += r.generated;
                totalSkipped += r.skipped;
            }

            console.log(`✅ Total: ${totalGenerated} generated, ${totalSkipped} skipped`);
        } catch (error) {
            console.error("❌ Slot generation failed:", error);
        }
    }

    // 🔓 CLEAN LOCKS
    // private static async cleanupExpiredLocks() {
    //     try {
    //         const now = new Date();

    //         const result = await Slot.updateMany(
    //             {
    //                 status: "locked",
    //                 lockedUntil: { $lt: now },
    //             },
    //             {
    //                 status: "available",
    //                 lockedBy: null,
    //                 lockedUntil: null,
    //                 $inc: { version: 1 },
    //             },
    //         );

    //         if (result.modifiedCount > 0) {
    //             console.log(`🔓 Released ${result.modifiedCount} expired locks`);
    //         }
    //     } catch (error) {
    //         console.error("❌ Lock cleanup failed:", error);
    //     }
    // }

    // private static startCleanupLoop() {
    //     const run = async () => {
    //         if (this.isCleaning) return;

    //         this.isCleaning = true;
    //         console.log("🧹 Running cleanup...");

    //         setImmediate(async () => {
    //             try {
    //                 await slotServices.cleanupExpiredLocksAndBookings();
    //             } catch (err) {
    //                 console.error("❌ Cleanup error:", err);
    //             } finally {
    //                 this.isCleaning = false;
    //             }
    //         });
    //     };

    //     setInterval(run, 60 * 60 * 1000); // every 1 hour
    // }
}
