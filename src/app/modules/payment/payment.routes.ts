import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { paymentControllers } from "./payment.controllers";
import { paymentValidations } from "./payment.validations";

const router = Router();

router.post("/initiate", auth, validateRequest(paymentValidations.initiatePaymentSchema), paymentControllers.initiatePayment);

router.post("/refund", auth, authorize(["SUPER_ADMIN", "ADMIN"]), validateRequest(paymentValidations.makeRefundSchema), paymentControllers.makeRefund);

export const paymentRoutes = router;
