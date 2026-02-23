import { Router } from "express";
import { authControllers } from "./auth.controllers";
import validateRequest from "../../middlewares/validateRequest";
import { changePasswordSchema, loginSchema, registerSchema, resendEmailUpdateSchema, resendVerificationSchema, updateEmailSchema, updateProfileSchema } from "./auth.validations";
import auth from "../../middlewares/auth";
const router = Router();

// Public routes
router.post("/register", validateRequest(registerSchema), authControllers.register);
router.post("/login", validateRequest(loginSchema), authControllers.login);
router.get("/verify-email", authControllers.verifyEmail);
router.post("/resend-verification", auth, authControllers.resendVerificationEmail);
router.post("/refresh-token", authControllers.refreshAccessToken);
router.post("/forgot-password", authControllers.requestPasswordReset);
router.post("/verify-otp", authControllers.verifyOtp);
router.post("/resend-otp", authControllers.resendOtp);
router.post("/reset-password", authControllers.resetPassword);

// Protected routes (require auth)
router.get("/me", auth, authControllers.getMe);
router.post("/logout", auth, authControllers.logout);
router.patch("/profile", auth, validateRequest(updateProfileSchema), authControllers.updateProfile);
router.post("/change-password", auth, validateRequest(changePasswordSchema), authControllers.changePassword);
router.post("/update-email", auth, validateRequest(updateEmailSchema), authControllers.updateEmail);
router.get("/verify-new-email", authControllers.verifyNewEmail);
router.post("/resend-email-update", auth, validateRequest(resendEmailUpdateSchema), authControllers.resendEmailUpdate);

// Admin only routes
router.post("/set-password/:userId", auth, authControllers.setUserPassword);

export const authRoutes = router;
