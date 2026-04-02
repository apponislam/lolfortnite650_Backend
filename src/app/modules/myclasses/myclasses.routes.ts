import express from "express";
import { MyClassControllers } from "./myclasses.controllers";
import { MyClassWebhookControllers } from "./myclasses.webhook";
import auth from "../../middlewares/auth";

const router = express.Router();

// Initiate payment (only for authenticated students)
router.post("/initiate-payment", auth, MyClassControllers.initiateClassPayment);

// Get student/teacher classes
router.get("/student", auth, MyClassControllers.getStudentClasses);
router.get("/teacher", auth, MyClassControllers.getTeacherClasses);

// Verify payment status (callback from MyFatoorah)
router.get("/verify-payment", MyClassControllers.verifyClassPayment);

// Webhook for MyFatoorah (Dedicated file)
router.post("/webhook", MyClassWebhookControllers.handleMyFatoorahWebhook);

export const MyClassRoutes = router;
