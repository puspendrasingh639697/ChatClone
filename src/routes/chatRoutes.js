const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const auth = require("../middleware/auth");

// 💬 GET MESSAGES BETWEEN TWO USERS
router.get("/messages/:receiverId", auth, async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.params;
    
    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name phone profilePic')
    .populate('receiver', 'name phone profilePic');
    
    res.json({
      success: true,
      messages,
      count: messages.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📨 SEND MESSAGE (REST API backup)
router.post("/send", auth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user._id;
    
    // Create message
    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content,
      isDelivered: false,
      isRead: false
    });
    
    await message.save();
    
    // Populate user info
    await message.populate([
      { path: 'sender', select: 'name phone profilePic' },
      { path: 'receiver', select: 'name phone profilePic' }
    ]);
    
    res.json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ MARK AS READ
router.post("/mark-read", auth, async (req, res) => {
  try {
    const { senderId, messageIds } = req.body;
    const receiverId = req.user._id;
    
    // Update messages as read
    await Message.updateMany(
      {
        sender: senderId,
        receiver: receiverId,
        isRead: false,
        ...(messageIds && { _id: { $in: messageIds } })
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    res.json({
      success: true,
      message: 'Messages marked as read'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;