import { Router } from "express";
import { ZoomController } from "./zoom.controllers";
import validateRequest from "../../middlewares/validateRequest";
import auth from "../../middlewares/auth";
import { zoomValidations } from "./zoom.validations";

const router = Router();

// Protected routes
router.post("/create-meeting", auth, validateRequest(zoomValidations.createMeetingSchema), ZoomController.createMeeting);

router.get("/recordings/:meetingId", auth, ZoomController.getMeetingRecordings);

// Get user's meetings and recordings
router.get("/meetings", auth, ZoomController.getUserMeetings);
router.get("/recordings", auth, ZoomController.getUserRecordings);

// Webhook route (no auth, as it's from Zoom)
router.post("/webhook", ZoomController.handleWebhook);

export const zoomRoutes = router;
