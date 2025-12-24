// src/middleware/socketAuth.js
const User = require("../models/User");

module.exports = async (socket, next) => {
  try {
    const { userId, userName, projectId } = socket.handshake.auth;

    if (!userId || !projectId) {
      return next(new Error("Unauthorized socket"));
    }

    let user = await User.findOne({ _id: userId, projectId });

    if (!user) {
      user = await User.create({
        _id: userId,
        name: userName || "Chat User",
        projectId
      });
    }

    user.socketId = socket.id;
    user.isOnline = true;
    await user.save();

    socket.user = user;
    next();
  } catch (err) {
    console.error("❌ Socket Auth Error:", err.message);
    next(new Error("Socket authentication failed"));
  }
};
