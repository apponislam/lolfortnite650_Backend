import express from "express";
import { ConversationControllers } from "./conversion.controllers";
import auth from "../../middlewares/auth";

const router = express.Router();

// All routes require authentication

// Conversation routes
router.post("/", auth, ConversationControllers.createConversation);
router.get("/", auth, ConversationControllers.getUserConversations);
router.get("/:conversationId", auth, ConversationControllers.getConversationById);
router.patch("/:conversationId", auth, ConversationControllers.updateGroupConversation);
router.post("/:conversationId/participants", auth, ConversationControllers.addParticipantsToGroup);
router.delete("/:conversationId/participants/:participantId", auth, ConversationControllers.removeParticipantFromGroup);
router.post("/:conversationId/read", auth, ConversationControllers.markConversationAsRead);

export const ConversationRoutes = router;
