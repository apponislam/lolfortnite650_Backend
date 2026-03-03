import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { contactControllers } from "./contact.controllers";

const router = Router();

// Public — anyone can view contact info
router.get("/", contactControllers.getContact);

// Admin-only — create or update contact info
router.post("/", auth, authorize(["ADMIN", "SUPER_ADMIN"]), contactControllers.upsertContact);

export const contactRoutes = router;
