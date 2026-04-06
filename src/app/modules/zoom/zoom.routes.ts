import { Router } from "express";
import { ZoomController } from "./zoom.controllers";
import validateRequest from "../../middlewares/validateRequest";
import auth from "../../middlewares/auth";
import { zoomValidations } from "./zoom.validations";

const router = Router();

// Meeting creation
router.post(
    "/create-meeting", 
    auth, 
    validateRequest(zoomValidations.createMeetingSchema), 
    ZoomController.createMeeting
);

// Fetch and update recording details for a specific meeting
router.patch(
    "/update-recordings/:meetingId", 
    auth, 
    ZoomController.updateMeetingRecordings
);

// Get my meetings (includes recording info if fetched)
router.get(
    "/my-meetings", 
    auth, 
    ZoomController.getMyMeetings
);

// Get single meeting details
router.get(
    "/details/:meetingId", 
    auth, 
    ZoomController.getMeetingDetails
);

export const zoomRoutes = router;
