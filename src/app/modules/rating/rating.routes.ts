import { Router } from "express";
import { RatingController } from "./rating.controllers";
import auth from "../../middlewares/auth";

const router = Router();

router.post("/", auth, RatingController.createRating);
router.get("/", auth, RatingController.getRatings);
router.get("/:id", auth, RatingController.getRatingById);
router.patch("/:id", auth, RatingController.updateRating);
router.delete("/:id", auth, RatingController.deleteRating);

export const ratingRoutes = router;
