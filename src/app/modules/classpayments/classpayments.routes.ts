import express from "express";
import { ClassPaymentControllers } from "./classpayments.controllers";
import { ClassPaymentWebhookControllers } from "./classpayments.webhook";
import auth from "../../middlewares/auth";

const router = express.Router();

// Initiate payment (only for authenticated students)
router.post("/initiate-payment", auth, ClassPaymentControllers.initiateClassPayment);

// Initiate mobile payment (with SessionId for SDK)
router.post("/initiate-mobile-payment", auth, ClassPaymentControllers.initiateMobileClassPayment);

// Get student/teacher classes
router.get("/student", auth, ClassPaymentControllers.getStudentClasses);
router.get("/teacher", auth, ClassPaymentControllers.getTeacherClasses);

// Verify payment status (callback from MyFatoorah)
router.get("/verify-payment", ClassPaymentControllers.verifyClassPayment);

// Webhook for MyFatoorah (Dedicated file)
router.post("/webhook", ClassPaymentWebhookControllers.handleMyFatoorahWebhook);

export const ClassPaymentRoutes = router;
