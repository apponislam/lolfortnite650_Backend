import { Router } from "express";
import { ZoomController } from "./zoom.controllers";
import validateRequest from "../../middlewares/validateRequest";
import auth from "../../middlewares/auth";
import { zoomValidations } from "./zoom.validations";

const router = Router();

// Protected routes
router.post("/create-meeting", auth, validateRequest(zoomValidations.createMeetingSchema), ZoomController.createMeeting);

router.get("/recordings/:meetingId", auth, ZoomController.getMeetingRecordings);

// Webhook route (no auth, as it's from Zoom)
router.post("/webhook", ZoomController.handleWebhook);

export const zoomRoutes = router;
