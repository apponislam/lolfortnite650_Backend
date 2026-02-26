import express from "express";

const router = express.Router();

// All routes require authentication
router.use(auth());

// Conversation routes
router.post("/", conversationController.createConversation);
router.get("/", conversationController.getUserConversations);
router.get("/:conversationId", conversationController.getConversationById);
router.patch("/:conversationId", conversationController.updateGroupConversation);
router.post("/:conversationId/participants", conversationController.addParticipantsToGroup);
router.delete("/:conversationId/participants/:participantId", conversationController.removeParticipantFromGroup);
router.post("/:conversationId/read", conversationController.markConversationAsRead);

export const ConversationRoutes = router;
