require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

// Models
const User = require("./models/User");
const Message = require("./models/Message");

// Routes
const chatRoutes = require("./routes/chatRoutes"); // REST APIs

// DB Connect
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB Connected"))
.catch((err) => console.error("❌ MongoDB Error:", err));

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "*",
  allowedHeaders: ["Content-Type", "x-user-id", "x-user-name"]
}));
app.use(express.json());

// Auto-register middleware for REST APIs
app.use(async (req, res, next) => {
  const userId = req.headers["x-user-id"];
  const userName = req.headers["x-user-name"];
  if (!userId || !userName) return next();

  let user = await User.findById(userId);
  if (!user) {
    user = await User.create({ _id: userId, name: userName });
  }
  req.user = user;
  next();
});

// REST APIs
app.use("/api/chat", chatRoutes);

// ---------------------- SOCKET.IO ----------------------
const io = new Server(server, { cors: { origin: "*" } });

// Auto-register socket users
io.use(async (socket, next) => {
  try {
    const { userId, userName } = socket.handshake.auth;
    if (!userId || !userName) return next(new Error("Socket authentication failed"));

    let user = await User.findById(userId);
    if (!user) user = await User.create({ _id: userId, name: userName });

    socket.user = user;
    user.socketId = socket.id;
    await user.save();

    next();
  } catch (err) {
    next(new Error("Socket auth error"));
  }
});

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.user._id, socket.user.name);

  // Send message
  socket.on("send-message", async ({ to, content }) => {
    if (!to || !content) return;

    const msg = await Message.create({
      sender: socket.user._id,
      receiver: to,
      content
    });

    // Send to receiver if online
    const receiver = await User.findById(to);
    if (receiver?.socketId) {
      io.to(receiver.socketId).emit("new-message", msg);
    }

    // Emit back to sender
    socket.emit("new-message", msg);
  });

  // Disconnect
  socket.on("disconnect", async () => {
    await User.findByIdAndUpdate(socket.user._id, { socketId: null });
    console.log("🔴 Disconnected:", socket.user._id);
  });
});

// ---------------------- START SERVER ----------------------
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🔥 Chat Backend Ready on ${PORT}`));
