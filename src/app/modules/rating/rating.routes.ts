import { Router } from "express";
import { RatingController } from "./rating.controllers";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";

const router = Router();

// Public routes (No Auth)
router.get("/class/:classId", RatingController.getRatings); // Get ratings for a single class
router.get("/teacher/:tutorId", RatingController.getRatings); // Get ratings for a teacher

// Admin routes
router.get("/admin", auth, authorize(["ADMIN", "SUPER_ADMIN"]), RatingController.getRatings);

// User/Student routes
router.post("/", auth, RatingController.createRating);
router.get("/", auth, RatingController.getRatings);
router.get("/:id", auth, RatingController.getRatingById);
router.patch("/:id", auth, RatingController.updateRating);
router.delete("/:id", auth, RatingController.deleteRating);

export const ratingRoutes = router;
