import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { cardControllers } from "./card.controllers";
import { cardValidations } from "./card.validations";

const router = Router();

// Get user's saved cards
router.get("/", auth, cardControllers.getUserCards);

// Initiate payment (with or without saved card)
router.post("/initiate-payment", auth, validateRequest(cardValidations.initiateCardPaymentSchema), cardControllers.initiateCardPayment);

// Save card from successful payment
router.post("/save-card", auth, validateRequest(cardValidations.saveCardSchema), cardControllers.saveCardFromPayment);

// Delete a card
router.delete("/:cardId", auth, cardControllers.deleteCard);

// Set default card
router.patch("/:cardId/default", auth, cardControllers.setDefaultCard);

export const cardRoutes = router;
