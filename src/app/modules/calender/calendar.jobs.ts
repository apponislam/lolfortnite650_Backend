import cron from "node-cron";
import { CalendarService } from "./calendar.service";
import { TeacherAvailability, Slot } from "./calendar.model";

const calendarService = new CalendarService();

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
                await calendarService.cleanupExpiredLocksAndBookings();
            },
            { timezone: "UTC" },
        );

        // 4. DAILY at 3 AM - Clean up old completed bookings (older than 3 months)
        // cron.schedule(
        //     "0 3 * * *",
        //     async () => {
        //         console.log("📦 Archiving old bookings...");
        //         await this.cleanupOldBookings();
        //     },
        //     { timezone: "UTC" },
        // );

        // 5. RUN ON STARTUP (after 10 seconds to ensure DB connection)
        setTimeout(async () => {
            console.log("🚀 Running startup slot generation...");
            await this.generateSlotsForAllTeachers();
            console.log("🧹 Running startup cleanup...");
            await calendarService.cleanupExpiredLocksAndBookings();
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
                    const result = await calendarService.generateSlotsForTeacher(teacherId.toString());
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

    // private static async cleanupOldBookings() {
    //     try {
    //         const threeMonthsAgo = new Date();
    //         threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    //         // Delete old completed/cancelled slots
    //         const result = await Slot.deleteMany({
    //             date: { $lt: threeMonthsAgo },
    //             status: { $in: ["booked", "cancelled", "completed"] },
    //         });

    //         if (result.deletedCount > 0) {
    //             console.log(`📦 Archived ${result.deletedCount} old slots`);
    //         }
    //     } catch (error) {
    //         console.error("❌ Archival failed:", error);
    //     }
    // }
}
