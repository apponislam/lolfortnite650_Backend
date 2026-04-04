import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { withdrawControllers } from "./withdraw.controllers";

const router = Router();

// Teacher routes
router.post("/request", auth, authorize(["TEACHER"]), withdrawControllers.createWithdrawRequest);

router.get("/my-requests", auth, authorize(["TEACHER"]), withdrawControllers.getMyWithdrawRequests);

router.patch("/cancel/:withdrawId", auth, authorize(["TEACHER"]), withdrawControllers.cancelWithdrawRequest);

// Admin routes
router.get("/all", auth, authorize(["ADMIN", "SUPER_ADMIN"]), withdrawControllers.getWithdrawRequests);

router.patch("/status/:withdrawId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), withdrawControllers.updateWithdrawStatus);

export const WithdrawRoutes = router;
