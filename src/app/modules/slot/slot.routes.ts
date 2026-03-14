import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { slotControllers } from "./slot.controllers";

const router = Router();
// const calendarController = new CalendarController();

// ==================== SLOT ROUTES ====================

// Public routes (anyone can view)
router.get("/slots/available/:teacherId", slotControllers.getAvailableSlots);
// router.get("/slots/:slotId/status", calendarController.getSlotStatus);

// Teacher routes
// router.get("/slots/teacher/:teacherId", auth, authorize(["TEACHER"]), slotControllers.getTeacherSlots);

// Student routes
// router.post("/slots/:slotId/lock", auth, authorize(["STUDENT"]), slotControllers.lockSlot);
// router.delete("/slots/:slotId/lock", auth, authorize(["STUDENT"]), slotControllers.releaseLock);

// Admin routes
// router.get("/admin/slots/teacher/:teacherId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), slotControllers.getTeacherSlots);

export const slotRouter = router;
