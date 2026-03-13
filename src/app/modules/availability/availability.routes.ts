import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { availabilityController } from "./availability.controllers";

const router = Router();

router.get("/availability/:teacherId", availabilityController.getTeacherAvailability);

// ==================== TEACHER ONLY ROUTES ====================
router.post("/availability", auth, authorize(["TEACHER"]), availabilityController.setTeacherAvailability);

export const availabilityRoutes = router;
