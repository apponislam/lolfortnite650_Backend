// import { Router } from "express";
// import { CalendarController } from "./calendar.controller";
// import auth from "../../middlewares/auth";
// import authorize from "../../middlewares/authorized";

// const router = Router();
// const calendarController = new CalendarController();

// // ==================== PUBLIC ROUTES (NO AUTH NEEDED) ====================
// // Anyone can view available slots
// router.get("/slots/available/:teacherId", calendarController.getAvailableSlots);

// // Anyone can check slot status (useful for UI)
// router.get("/slots/:slotId/status", calendarController.getSlotStatus);

// // Anyone can view teacher's public availability
// router.get("/availability/:teacherId", calendarController.getTeacherAvailability);

// // ==================== TEACHER ONLY ROUTES ====================
// // Teacher sets their availability
// router.post("/availability", auth, authorize(["TEACHER"]), calendarController.setTeacherAvailability);

// // Teacher views their own slots
// router.get("/slots/teacher/:teacherId", auth, authorize(["TEACHER"]), calendarController.getTeacherSlots);

// // ==================== STUDENT ONLY ROUTES ====================
// // Student locks a slot before payment
// router.post("/slots/:slotId/lock", auth, authorize(["STUDENT"]), calendarController.lockSlot);

// // Student releases lock (if they cancel checkout)
// router.delete("/slots/:slotId/lock", auth, authorize(["STUDENT"]), calendarController.releaseLock);

// // Student creates pending booking
// router.post("/bookings/pending", auth, authorize(["STUDENT"]), calendarController.createPendingBooking);

// // Confirm booking after payment success
// router.post("/bookings/:bookingId/confirm", auth, authorize(["STUDENT"]), calendarController.confirmBooking);

// // Student cancels their booking
// router.put("/bookings/:bookingId/cancel", auth, authorize(["STUDENT"]), calendarController.cancelBooking);

// // Student views their own bookings
// router.get("/bookings/student/:studentId", auth, authorize(["STUDENT"]), calendarController.getStudentBookings);

// // Student views their own booking details
// router.get("/bookings/:bookingId", auth, authorize(["STUDENT"]), calendarController.getBookingById);

// // ==================== ADMIN ROUTES (if needed) ====================
// // Admin can view any teacher's slots
// router.get("/admin/slots/teacher/:teacherId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), calendarController.getTeacherSlots);

// // Admin can view any student's bookings
// router.get("/admin/bookings/student/:studentId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), calendarController.getStudentBookings);

// export const calendarRouter = router;
