import cron from "node-cron";
import { TeacherAvailability } from "../availability/availability.model";
import { Slot } from "./slot.model";
import { slotServices } from "./slot.services";

export class CalendarJobs {
    private static isInitialized = false;

    static initializeAllJobs() {
        if (this.isInitialized) {
            return;
        }

        console.log("🚀 Starting calendar automation...");

        // 1. DAILY at 2 AM - Generate slots for next 30 days for ALL teachers
        cron.schedule(
            "0 2 * * *",
            async () => {
                console.log("📅 Running daily slot generation for all teachers...");
                await this.generateSlotsForAllTeachers();
            },
            { timezone: "UTC" },
        );

        // 2. EVERY 5 MINUTES - Release expired locks (fast cleanup)
        cron.schedule(
            "*/5 * * * *",
            async () => {
                await this.cleanupExpiredLocks();
            },
            { timezone: "UTC" },
        );

        // 3. EVERY HOUR - Full cleanup of locks AND pending bookings
        cron.schedule(
            "0 * * * *",
            async () => {
                console.log("🧹 Running hourly full cleanup...");
                await slotServices.cleanupExpiredLocksAndBookings();
            },
            { timezone: "UTC" },
        );

        // 4. DAILY at 3 AM - Delete old slots and generate +1 day
        cron.schedule(
            "0 3 * * *",
            async () => {
                console.log("🗑️ Cleaning old slots before today...");
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                try {
                    // Delete old AVAILABLE, LOCKED, UNAVAILABLE slots
                    const result = await Slot.deleteMany({
                        date: { $lt: today },
                        status: { $in: ["available", "locked", "unavailable"] },
                    });
                    console.log(`🗑️ Deleted ${result.deletedCount} old slots`);

                    // Generate new slots for +1 day for all teachers
                    console.log("📅 Generating new slots for +1 day...");
                    const teachers = await TeacherAvailability.find({}).distinct("teacher");

                    for (const teacherId of teachers) {
                        await slotServices.generateSlotsForTeacher(teacherId.toString());
                    }
                    console.log("✅ Slot generation completed");
                } catch (err) {
                    console.error("❌ Failed to cleanup old slots or generate new slots:", err);
                }
            },
            { timezone: "UTC" },
        );

        // 5. RUN ON STARTUP (after 10 seconds to ensure DB connection)
        setTimeout(async () => {
            console.log("🚀 Running startup slot generation...");
            await this.generateSlotsForAllTeachers();
            console.log("🧹 Running startup cleanup...");
            await slotServices.cleanupExpiredLocksAndBookings();
        }, 10000);

        this.isInitialized = true;
        console.log("✅ Calendar automation running 24/7:");
        console.log("   - Daily slot generation at 2 AM");
        console.log("   - Lock cleanup every 5 minutes");
        console.log("   - Full cleanup every hour");
        console.log("   - Old booking archival at 3 AM");
    }

    private static async generateSlotsForAllTeachers() {
        try {
            // Get all teachers who have set their availability
            const teachers = await TeacherAvailability.find({}).distinct("teacher");

            if (teachers.length === 0) {
                console.log("   No teachers found with availability set");
                return;
            }

            let totalGenerated = 0;
            let totalSkipped = 0;

            for (const teacherId of teachers) {
                try {
                    const result = await slotServices.generateSlotsForTeacher(teacherId.toString());
                    totalGenerated += result.generated;
                    totalSkipped += result.skipped;

                    console.log(`   ✓ Teacher ${teacherId}: ${result.generated} new, ${result.skipped} existing`);
                } catch (error) {
                    console.error(`   ✗ Failed for teacher ${teacherId}:`, error);
                }
            }

            console.log(`   ✅ Total: ${totalGenerated} new slots generated, ${totalSkipped} skipped`);
        } catch (error) {
            console.error("❌ Slot generation failed:", error);
        }
    }

    private static async cleanupExpiredLocks() {
        try {
            const now = new Date();

            const result = await Slot.updateMany(
                {
                    status: "locked",
                    lockedUntil: { $lt: now },
                },
                {
                    status: "available",
                    lockedBy: null,
                    lockedUntil: null,
                    $inc: { version: 1 },
                },
            );

            if (result.modifiedCount > 0) {
                console.log(`🔓 Released ${result.modifiedCount} expired locks`);
            }
        } catch (error) {
            console.error("❌ Lock cleanup failed:", error);
        }
    }
}
