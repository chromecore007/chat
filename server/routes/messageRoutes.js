const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const protect = require("../middleware/authMiddleware");
const mongoose = require("mongoose");

router.get("/:userId", protect, async (req, res) => {
  try {
    const userA = new mongoose.Types.ObjectId(req.user._id);
    const userB = new mongoose.Types.ObjectId(req.params.userId);

    const conversationId = [userA.toString(), userB.toString()]
      .sort()
      .join("_");

    const messages = await Message.find({
      $or: [
        { conversationId }, // ✅ new messages
        { sender: userA, receiver: userB }, // ✅ old (A → B)
        { sender: userB, receiver: userA }, // ✅ old (B → A)
      ],
    }).sort("createdAt");

    res.json(messages);
  } catch (err) {
    console.error("❌ FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

module.exports = router;
