import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { dashboardControllers } from "./dashboard.controllers";

const router = Router();

// Admin-only dashboard stats
router.get("/admin-stats", auth, authorize(["ADMIN", "SUPER_ADMIN"]), dashboardControllers.getAdminDashboardStats);
router.get("/monthly-registration", auth, authorize(["ADMIN", "SUPER_ADMIN"]), dashboardControllers.getMonthlyRegistrationStats);

export const DashboardRoutes = router;
