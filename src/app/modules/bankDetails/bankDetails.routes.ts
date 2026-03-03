import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { bankDetailsControllers } from "./bankDetails.controllers";

const router = Router();

// All routes require authentication
router.use(auth);

// User routes
router.post("/", bankDetailsControllers.addBankAccount);
router.get("/", bankDetailsControllers.getMyBankAccounts);
router.get("/:accountId", bankDetailsControllers.getBankAccountById);
router.patch("/:accountId", bankDetailsControllers.updateBankAccount);
router.patch("/:accountId/set-default", bankDetailsControllers.setDefaultAccount);
router.delete("/:accountId", bankDetailsControllers.deleteBankAccount);

// Admin-only route
router.patch("/:accountId/verify", authorize(["ADMIN", "SUPER_ADMIN"]), bankDetailsControllers.verifyBankAccount);

export const bankDetailsRoutes = router;
