import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { dashboardControllers } from "./dashboard.controllers";

const router = Router();

// Admin-only dashboard stats
router.get("/admin-stats", auth, authorize(["ADMIN", "SUPER_ADMIN"]), dashboardControllers.getAdminDashboardStats);
router.get("/monthly-registration", auth, authorize(["ADMIN", "SUPER_ADMIN"]), dashboardControllers.getMonthlyRegistrationStats);
router.get("/user-distribution", auth, authorize(["ADMIN", "SUPER_ADMIN"]), dashboardControllers.getUserRoleDistribution);

router.get("/monthly-payments", auth, authorize(["ADMIN", "SUPER_ADMIN"]), dashboardControllers.getMonthlyPaymentStats);
router.get("/monthly-withdrawals", auth, authorize(["ADMIN", "SUPER_ADMIN"]), dashboardControllers.getMonthlyWithdrawStats);

// Teacher-only dashboard stats
router.get("/teacher-stats", auth, authorize(["TEACHER"]), dashboardControllers.getTeacherDashboardStats);
router.get("/teacher-overview", auth, authorize(["TEACHER"]), dashboardControllers.getTeacherOverviewStats);
router.get("/teacher-ratings", auth, authorize(["TEACHER"]), dashboardControllers.getTeacherRatingStats);
router.get("/teacher-weekly-earnings", auth, authorize(["TEACHER"]), dashboardControllers.getTeacherWeeklyEarningStats);
router.get("/teacher-financial-stats", auth, authorize(["TEACHER"]), dashboardControllers.getTeacherFinancialStats);

export const DashboardRoutes = router;
