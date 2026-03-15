import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { slotControllers } from "./slot.controllers";

const router = Router();
// const calendarController = new CalendarController();

// ==================== SLOT ROUTES ====================

// Public routes (anyone can view)
router.get("/available/:teacherId", slotControllers.getAvailableSlots);
router.get("/:slotId/status", slotControllers.getSlotStatus);

// Teacher routes
router.get("/teacher", auth, authorize(["TEACHER"]), slotControllers.getTeacherSlots);

// Student routes
// router.post("/slots/:slotId/lock", auth, authorize(["STUDENT"]), slotControllers.lockSlot);
// router.delete("/slots/:slotId/lock", auth, authorize(["STUDENT"]), slotControllers.releaseLock);

// Admin or Teacher can mark slots unavailable or update status
router.patch("/:slotId/status", auth, authorize(["TEACHER", "ADMIN", "SUPER_ADMIN"]), slotControllers.updateSlotStatusController);

// Admin routes
router.get("/admin/teacher/:teacherId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), slotControllers.getTeacherSlotsAdmin);

export const slotRouter = router;
