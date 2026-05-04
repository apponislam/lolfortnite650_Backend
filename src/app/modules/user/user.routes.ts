import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { userControllers } from "./user.controllers";

const router = Router();

// Only admin and super_admin can manage teachers
router.get("/teachers", auth, authorize(["ADMIN", "SUPER_ADMIN"]), userControllers.getAllTeachers);

router.get("/students", auth, authorize(["ADMIN", "SUPER_ADMIN"]), userControllers.getAllStudents);

router.patch("/teacher-status/:id", auth, authorize(["ADMIN", "SUPER_ADMIN"]), userControllers.updateTeacherStatus);

router.patch("/toggle-active/:id", auth, authorize(["ADMIN", "SUPER_ADMIN"]), userControllers.toggleUserActive);

router.patch("/commission/:id", auth, authorize(["ADMIN", "SUPER_ADMIN"]), userControllers.updateCommission);

router.get("/:id", auth, userControllers.getSingleUser);

export const userRoutes = router;
