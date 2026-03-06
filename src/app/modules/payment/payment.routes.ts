import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { paymentControllers } from "./payment.controllers";
import { paymentValidations } from "./payment.validations";

const router = Router();

// Endpoints for users to initiate payment
router.post(
    "/initiate",
    auth, // Only authenticated users can initialize a payment
    validateRequest(paymentValidations.initiatePaymentSchema),
    paymentControllers.initiatePayment
);

// MyFatoorah Webhook endpoint 
// MyFatoorah will send POST requests here when the status of an invoice changes.
router.post("/webhook", paymentControllers.webhook);

export const paymentRoutes = router;
