import { Router } from "express";
import { CalendarController } from "./calendar.controller";

const router = Router();
const calendarController = new CalendarController();

// ==================== USER ACTIONS (REQUIRED) ====================

// Student locks a slot before payment
router.post("/slots/:slotId/lock", calendarController.lockSlot);

// Student releases lock (if they cancel checkout)
router.delete("/slots/:slotId/lock", calendarController.releaseLock);

// Student creates pending booking
router.post("/bookings/pending", calendarController.createPendingBooking);

// Confirm booking after payment success
router.post("/bookings/:bookingId/confirm", calendarController.confirmBooking);

// Student cancels their booking
router.put("/bookings/:bookingId/cancel", calendarController.cancelBooking);

// ==================== QUERY ENDPOINTS ====================

// Get available slots
router.get("/slots/available/:teacherId", calendarController.getAvailableSlots);

// Get teacher slots
router.get("/slots/teacher/:teacherId", calendarController.getTeacherSlots);

// Get slot status
router.get("/slots/:slotId/status", calendarController.getSlotStatus);

// Get student bookings
router.get("/bookings/student/:studentId", calendarController.getStudentBookings);

// Get booking details
router.get("/bookings/:bookingId", calendarController.getBookingById);

// Get teacher availability
router.get("/availability/:teacherId", calendarController.getTeacherAvailability);

export default router;
