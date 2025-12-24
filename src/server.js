const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 1. Connection logic
mongoose.connect("mongodb://localhost:27017/chatDB")
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.log("❌ DB Connection Error:", err));

// 2. User Schema (Aapka bilkul sahi tha)
const User = mongoose.model("User", new mongoose.Schema({
  _id: String,
  name: String,
  socketId: String
}));

// 3. Socket Middleware (Main Fix Yahan Hai)
io.use(async (socket, next) => {
  try {
    const { userId, userName } = socket.handshake.auth;
    
    // Debugging ke liye console log
    console.log("Auth Attempt:", { userId, userName });

    if (!userId) return next(new Error("Authentication failed: Data missing"));

    // FIX: findOneAndUpdate use karein with $set
    const user = await User.findOneAndUpdate(
      { _id: userId }, 
      { $set: { name: userName || "User", socketId: socket.id } }, 
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    socket.user = user;
    next();
  } catch (err) {
    console.error("🔥 Socket Middleware Error:", err.message);
    next(new Error("Internal Server Error: Database Save Failed"));
  }
});
// ... baaki upar ka code same rahega ...

io.on("connection", (socket) => {
  console.log("🚀 User Connected:", socket.user.name);

  // FIX: Ye logic connection ke andar hona zaroori hai
  socket.on("send-message", async ({ to, content }) => {
    try {
      const receiver = await User.findById(to);
      if (receiver && receiver.socketId) {
        // Receiver ko message bhejna
        io.to(receiver.socketId).emit("new-message", {
          sender: socket.user._id, 
          content: content
        });
      }
    } catch (err) {
      console.error("❌ Send Error:", err);
    }
  });

 // server.js ke andar
socket.on("send-message", async ({ to, content }) => {
  const receiver = await User.findById(to);
  if (receiver && receiver.socketId) {
    // Ye line receiver ko message bhejti hai
    io.to(receiver.socketId).emit("new-message", {
      sender: socket.user._id,
      content: content
    });
  }
});
});

server.listen(4000, () => console.log("📡 Chat Server running on port 4000"));