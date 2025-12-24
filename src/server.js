require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIo = require("socket.io");
const axios = require("axios");

const connectDB = require("./config/database");
const User = require("./models/User");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);

connectDB();

app.use(cors({
  origin: "*",
  allowedHeaders: ["Content-Type", "x-user-id", "x-user-name"]
}));
app.use(express.json());

// API ROUTES
app.get("/api/chat/users", async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/chat/messages/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: req.headers["x-user-id"], receiver: userId },
        { sender: userId, receiver: req.headers["x-user-id"] }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SOCKET.IO
const io = socketIo(server, { cors: { origin: "*" } });

io.use(async (socket, next) => {
  try {
    const { userId, userName } = socket.handshake.auth;

    if (!userId || !userName) return next(new Error("Unauthorized"));

    // check if user exists in chat DB
    let user = await User.findById(userId);
    if (!user) {
      user = await User.create({ _id: userId, name: userName });
    }

    socket.user = user;
    user.socketId = socket.id;
    await user.save();

    next();
  } catch (err) {
    next(new Error("Socket auth error"));
  }
});

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.user._id);

  socket.on("send-message", async ({ to, content }) => {
    const msg = await Message.create({
      sender: socket.user._id,
      receiver: to,
      content
    });

    const receiver = await User.findById(to);
    if (receiver?.socketId) {
      io.to(receiver.socketId).emit("new-message", msg);
    }

    // sender ko bhi emit for instant UI update
    socket.emit("new-message", msg);
  });

  socket.on("disconnect", async () => {
    socket.user.socketId = null;
    await socket.user.save();
    console.log("🔴 User disconnected:", socket.user._id);
  });
});

server.listen(process.env.PORT, () => console.log(`🔥 Chat Backend Ready on ${process.env.PORT}`));
