import express from "express";
import { MessageControllers } from "./messages.controllers";
import auth from "../../middlewares/auth";
import { uploadMessageFiles } from "../../middlewares/uploadMessageFiles";

const router = express.Router();

// All routes require authentication
router.use(auth);

// Conversation management
router.post("/conversations", MessageControllers.createConversation);
router.get("/conversations", MessageControllers.getUserConversations);
router.get("/conversations/:conversationId", MessageControllers.getConversationById);
router.post("/conversations/:conversationId/read", MessageControllers.markAsRead);

// Message management
router.get("/conversations/:conversationId/messages", MessageControllers.getMessages);
router.post("/send", uploadMessageFiles, MessageControllers.sendMessage);
router.post("/:messageId/accept", MessageControllers.acceptOffer);
router.post("/:messageId/reject", MessageControllers.rejectOffer);
router.post("/:messageId/reschedule", MessageControllers.rescheduleOffer);
router.patch("/:messageId", MessageControllers.editMessage);
router.delete("/:messageId", MessageControllers.deleteMessage);

export const MessageRoutes = router;
