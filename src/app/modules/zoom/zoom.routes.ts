import { Router } from "express";
import { ZoomController } from "./zoom.controllers";
import auth from "../../middlewares/auth";

const router = Router();

// Meeting creation
router.post("/create-meeting", auth, ZoomController.createMeeting);

// Get my meetings (includes recording info if fetched)
router.get("/my-meetings", auth, ZoomController.getMyMeetings);

// Get single meeting details
router.get("/details/:meetingId", auth, ZoomController.getMeetingDetails);

// Get meetings by class ID
router.get("/class-meetings/:classId", auth, ZoomController.getMeetingsByClass);

export const zoomRoutes = router;
