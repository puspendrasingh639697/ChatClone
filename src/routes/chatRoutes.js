const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const Message = require("../models/Message");

// 🔐 Get users (same project only)
router.get("/users", authMiddleware, async (req, res) => {
  const users = await User.find({
    projectId: req.user.projectId,
    _id: { $ne: req.user._id }
  });

  res.json(users);
});

// 🔐 Get chat messages
router.get("/messages/:userId", authMiddleware, async (req, res) => {
  const messages = await Message.find({
    projectId: req.user.projectId,
    $or: [
      { sender: req.user._id, receiver: req.params.userId },
      { sender: req.params.userId, receiver: req.user._id }
    ]
  }).sort({ createdAt: 1 });

  res.json(messages);
});

module.exports = router;
