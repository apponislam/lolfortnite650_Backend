import express from "express";
import { hourlyClassControllers } from "./hourlyclass.controllers";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";

const router = express.Router();

// Public routes
router.get("/", hourlyClassControllers.getAllHourlyClasses);
router.get("/:id", hourlyClassControllers.getHourlyClassById);

// Teacher/Admin routes
router.post("/", auth, authorize(["TEACHER"]), hourlyClassControllers.createOrUpdateHourlyClass);
router.get("/my/class", auth, authorize(["TEACHER"]), hourlyClassControllers.getMyHourlyClass);

export const hourlyClassRoutes = router;
