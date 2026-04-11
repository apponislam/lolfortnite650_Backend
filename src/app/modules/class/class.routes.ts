import { Router } from "express";
import auth from "../../middlewares/auth";
import checkAuth from "../../middlewares/checkAuth";
import authorize from "../../middlewares/authorized";
import { classControllers } from "./class.controllers";
import { uploadClassImages } from "../../middlewares/uploadClassImages";

const router = Router();

router.get("/", checkAuth, classControllers.getClasses);
router.get("/my-classes", auth, authorize(["TEACHER"]), classControllers.getMyClasses);
router.get("/my-classes/:classId", auth, authorize(["TEACHER"]), classControllers.getMyClassById);
router.get("/:classId", classControllers.getClassById);

// router.post("/", auth, authorize(["TEACHER"]), uploadClassImages("images", 5), validateRequest(createClassSchema), classControllers.createClass);
router.post("/", auth, authorize(["TEACHER"]), uploadClassImages("images", 5), classControllers.createClass);
router.patch("/:classId", auth, authorize(["TEACHER"]), uploadClassImages("images", 5), classControllers.updateClass);
router.delete("/:classId", auth, authorize(["TEACHER", "ADMIN", "SUPER_ADMIN"]), classControllers.deleteClass);

router.patch("/:classId/status", auth, authorize(["ADMIN", "SUPER_ADMIN"]), classControllers.setStatus);

export const ClassRoutes = router;
