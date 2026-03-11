import { Router } from "express";
import { authControllers } from "./auth.controllers";
import validateRequest from "../../middlewares/validateRequest";
import { changePasswordSchema, loginSchema, resendEmailUpdateSchema, updateEmailSchema } from "./auth.validations";
import auth from "../../middlewares/auth";
import { uploadProfileImage } from "../../middlewares/multer";
const router = Router();

// Public routes
router.post("/register", uploadProfileImage, authControllers.register);
router.post("/login", validateRequest(loginSchema), authControllers.login);
router.get("/verify-email", authControllers.verifyEmail);
router.post("/resend-verification", authControllers.resendVerificationEmail);
router.post("/refresh-token", authControllers.refreshAccessToken);
router.post("/forgot-password", authControllers.requestPasswordReset);
router.post("/verify-otp", authControllers.verifyOtp);
router.post("/resend-otp", authControllers.resendOtp);
router.post("/reset-password", authControllers.resetPassword);

// Protected routes (require auth)
router.get("/me", auth, authControllers.getMe);
router.post("/logout", auth, authControllers.logout);
router.patch("/profile", auth, uploadProfileImage, authControllers.updateProfile);
router.post("/change-password", auth, validateRequest(changePasswordSchema), authControllers.changePassword);
router.post("/update-email", auth, validateRequest(updateEmailSchema), authControllers.updateEmail);
router.get("/verify-new-email", authControllers.verifyNewEmail);
router.post("/resend-email-update", auth, validateRequest(resendEmailUpdateSchema), authControllers.resendEmailUpdate);

// Admin only routes
router.post("/set-password/:userId", auth, authControllers.setUserPassword);

export const authRoutes = router;
