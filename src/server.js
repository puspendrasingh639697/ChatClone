require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/database");
const User = require("./models/User");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);

// DB CONNECT
connectDB();

// MIDDLEWARE
app.use(cors({ origin: "*" }));
app.use(express.json());

/* =======================
   REST APIs
======================= */

// GET ALL USERS
app.get("/api/chat/users", async (req, res) => {
  try {
    const users = await User.find({}, "_id name");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET MESSAGES BETWEEN TWO USERS
app.get("/api/chat/messages/:userId", async (req, res) => {
  try {
    const myId = req.headers["x-user-id"];
    const otherId = req.params.userId;

    if (!myId) {
      return res.status(401).json({ error: "Missing user id" });
    }

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherId },
        { sender: otherId, receiver: myId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =======================
   SOCKET.IO
======================= */

const io = new Server(server, {
  cors: { origin: "*" }
});

// SOCKET AUTH
io.use(async (socket, next) => {
  try {
    const { userId, userName } = socket.handshake.auth;

    if (!userId || !userName) {
      return next(new Error("Unauthorized"));
    }

    let user = await User.findById(userId);

    // AUTO CREATE USER
    if (!user) {
      user = await User.create({
        _id: userId,
        name: userName
      });
    }

    user.socketId = socket.id;
    await user.save();

    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Socket auth failed"));
  }
});

// SOCKET EVENTS
io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.user.name);

  socket.on("send-message", async ({ to, content }) => {
    if (!to || !content) return;

    const message = await Message.create({
      sender: socket.user._id,
      receiver: to,
      content
    });

    // SEND TO RECEIVER
    const receiver = await User.findById(to);
    if (receiver?.socketId) {
      io.to(receiver.socketId).emit("new-message", message);
    }

    // SEND TO SENDER
    socket.emit("new-message", message);
  });

  socket.on("disconnect", async () => {
    await User.findByIdAndUpdate(socket.user._id, {
      socketId: null
    });
    console.log("🔴 Disconnected:", socket.user.name);
  });
});

// SERVER START
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🔥 Chat Backend running on port ${PORT}`)
);
