const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const auth = require("../middleware/auth"); // <--- Check kar ye file path sahi hai na?

// Chat history fetch karne ka route

router.get("/messages/:id", authMiddleware, async (req, res) => {
  const Message = require("../models/Message");

  const messages = await Message.find({
    projectId: req.user.projectId,
    $or: [
      { sender: req.user._id, receiver: req.params.id },
      { sender: req.params.id, receiver: req.user._id }
    ]
  });

  res.json({ messages });
});

router.get("/:receiverId", auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.receiverId },
        { sender: req.params.receiverId, receiver: req.user._id }
      ]
    }).sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;