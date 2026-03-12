import { Request, Response } from "express";
import { CalendarService } from "./calendar.service";

const calendarService = new CalendarService();

export class CalendarController {
    async setTeacherAvailability(req: Request, res: Response): Promise<void> {
        try {
            const teacherId = req.user._id;
            const { availability } = req.body;

            if (!availability) {
                res.status(400).json({
                    success: false,
                    message: "availability is required",
                });
                return;
            }

            const result = await calendarService.setTeacherAvailability(teacherId, availability);

            res.status(result.isNew ? 201 : 200).json({
                success: true,
                message: result.message,
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ==================== USER ACTIONS (LOCK/UNLOCK) ====================

    /**
     * Student locks a slot before payment
     * POST /slots/:slotId/lock
     */
    async lockSlot(req: Request, res: Response): Promise<void> {
        try {
            const { slotId } = req.params;
            const { studentId } = req.body;

            if (!studentId) {
                res.status(400).json({
                    success: false,
                    message: "studentId is required",
                });
                return;
            }

            const result = await calendarService.lockSlotForBooking(studentId, slotId as string);

            res.status(200).json({
                success: true,
                message: "Slot locked successfully",
                data: {
                    slotId: result.slot._id,
                    lockExpiresAt: result.lockExpiresAt,
                    timeRemaining: Math.max(0, result.lockExpiresAt.getTime() - Date.now()),
                },
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Student releases a lock (if they cancel checkout)
     * DELETE /slots/:slotId/lock
     */
    async releaseLock(req: Request, res: Response): Promise<void> {
        try {
            const { slotId } = req.params;
            const { studentId } = req.body;

            if (!studentId) {
                res.status(400).json({
                    success: false,
                    message: "studentId is required",
                });
                return;
            }

            await calendarService.releaseSlotLock(studentId, slotId as string);

            res.status(200).json({
                success: true,
                message: "Slot lock released successfully",
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ==================== USER ACTIONS (BOOKING FLOW) ====================

    /**
     * Student creates a pending booking (before payment)
     * POST /bookings/pending
     */
    async createPendingBooking(req: Request, res: Response): Promise<void> {
        try {
            const { studentId, slotId } = req.body;

            if (!studentId || !slotId) {
                res.status(400).json({
                    success: false,
                    message: "studentId and slotId are required",
                });
                return;
            }

            const result = await calendarService.createPendingBooking(studentId, slotId);

            res.status(201).json({
                success: true,
                message: "Pending booking created",
                data: {
                    bookingId: result.booking._id,
                    expiresAt: result.expiresAt,
                    timeRemaining: Math.max(0, result.expiresAt.getTime() - Date.now()),
                },
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Confirm booking after payment success
     * POST /bookings/:bookingId/confirm
     */
    async confirmBooking(req: Request, res: Response): Promise<void> {
        try {
            const { bookingId } = req.params;
            const { paymentIntentId } = req.body;

            if (!paymentIntentId) {
                res.status(400).json({
                    success: false,
                    message: "paymentIntentId is required",
                });
                return;
            }

            const booking = await calendarService.confirmBooking(bookingId as string, paymentIntentId);

            res.status(200).json({
                success: true,
                message: "Booking confirmed successfully",
                data: booking,
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Student cancels their booking
     * PUT /bookings/:bookingId/cancel
     */
    async cancelBooking(req: Request, res: Response): Promise<void> {
        try {
            const { bookingId } = req.params;
            const { studentId } = req.body;

            if (!studentId) {
                res.status(400).json({
                    success: false,
                    message: "studentId is required",
                });
                return;
            }

            await calendarService.cancelBooking(bookingId as string, studentId);

            res.status(200).json({
                success: true,
                message: "Booking cancelled successfully",
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ==================== QUERY METHODS ====================

    /**
     * Get available slots for a teacher
     * GET /slots/available/:teacherId
     */
    async getAvailableSlots(req: Request, res: Response): Promise<void> {
        try {
            const { teacherId } = req.params;
            const { startDate, endDate } = req.query;

            const slots = await calendarService.getAvailableSlots(teacherId as string, startDate ? new Date(startDate as string) : undefined, endDate ? new Date(endDate as string) : undefined);

            res.status(200).json({
                success: true,
                count: slots.length,
                data: slots,
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Get student's bookings
     * GET /bookings/student/:studentId
     */
    async getStudentBookings(req: Request, res: Response): Promise<void> {
        try {
            const { studentId } = req.params;
            const { status } = req.query;

            const bookings = await calendarService.getStudentBookings(studentId as string, status as string);

            res.status(200).json({
                success: true,
                count: bookings.length,
                data: bookings,
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Get teacher's slots with booking status
     * GET /slots/teacher/:teacherId
     */
    async getTeacherSlots(req: Request, res: Response): Promise<void> {
        try {
            const { teacherId } = req.params;
            const { startDate, endDate } = req.query;

            const slots = await calendarService.getTeacherSlots(teacherId as string, startDate ? new Date(startDate as string) : undefined, endDate ? new Date(endDate as string) : undefined);

            res.status(200).json({
                success: true,
                count: slots.length,
                data: slots,
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Get slot status with lock information
     * GET /slots/:slotId/status
     */
    async getSlotStatus(req: Request, res: Response): Promise<void> {
        try {
            const { slotId } = req.params;

            const slotStatus = await calendarService.getSlotStatus(slotId as string);

            res.status(200).json({
                success: true,
                data: slotStatus,
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Get booking by ID
     * GET /bookings/:bookingId
     */
    async getBookingById(req: Request, res: Response): Promise<void> {
        try {
            const { bookingId } = req.params;

            const booking = await calendarService.getBookingById(bookingId as string);

            if (!booking) {
                res.status(404).json({
                    success: false,
                    message: "Booking not found",
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: booking,
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Get teacher availability template
     * GET /availability/:teacherId
     */
    async getTeacherAvailability(req: Request, res: Response): Promise<void> {
        try {
            const { teacherId } = req.params;

            const availability = await calendarService.getTeacherAvailability(teacherId as string);

            if (!availability) {
                res.status(404).json({
                    success: false,
                    message: "Teacher availability not found",
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: availability,
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
}
