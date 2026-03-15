import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { availabilityController } from "./availability.controllers";

const router = Router();

// ==================== TEACHER ONLY ROUTES ====================

// Get teacher availability
router.get("/", auth, authorize(["TEACHER"]), availabilityController.getTeacherAvailability);

// Create availability
router.post("/", auth, authorize(["TEACHER"]), availabilityController.setTeacherAvailability);

// Update availability
router.put("/", auth, authorize(["TEACHER"]), availabilityController.updateTeacherAvailability);

// Delete availability
router.delete("/", auth, authorize(["TEACHER"]), availabilityController.deleteTeacherAvailability);

export const availabilityRoutes = router;
