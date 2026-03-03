import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { classControllers } from "./class.controllers";
import { createClassSchema, updateClassSchema, setClassStatusSchema } from "./class.validations";

const router = Router();

router.get("/", classControllers.getClasses);
router.get("/:classId", classControllers.getClassById);

router.post("/", auth, authorize(["TEACHER"]), validateRequest(createClassSchema), classControllers.createClass);
router.patch("/:classId", auth, authorize(["TEACHER"]), validateRequest(updateClassSchema), classControllers.updateClass);
router.delete("/:classId", auth, authorize(["TEACHER", "ADMIN", "SUPER_ADMIN"]), classControllers.deleteClass);

router.post("/:classId/submit-review", auth, authorize(["TEACHER"]), classControllers.submitForReview);
router.patch("/:classId/status", auth, authorize(["ADMIN", "SUPER_ADMIN"]), validateRequest(setClassStatusSchema), classControllers.setStatus);

export const ClassRoutes = router;
