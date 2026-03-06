import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { paymentControllers } from "./payment.controllers";
import { paymentValidations } from "./payment.validations";

const router = Router();

// Endpoints for users to initiate payment
router.post(
    "/initiate",
    auth, // Only authenticated users can initialize a payment
    validateRequest(paymentValidations.initiatePaymentSchema),
    paymentControllers.initiatePayment,
);

// Refund processing
router.post(
    "/refund",
    auth,
    authorize(["SUPER_ADMIN", "ADMIN"]), // Restrict refund to admins
    validateRequest(paymentValidations.makeRefundSchema),
    paymentControllers.makeRefund,
);

// MyFatoorah Webhook endpoint
// MyFatoorah will send POST requests here when the status of an invoice changes.
// router.post("/webhook", paymentControllers.webhook);

export const paymentRoutes = router;
