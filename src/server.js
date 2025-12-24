require('dotenv').config(); // Environment variables load karne ke liye
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Socket setup with CORS
const io = new Server(server, { 
  cors: { 
    origin: "*", 
    methods: ["GET", "POST"] 
  } 
});

// 1. Database Connection (FIXED: Localhost hata kar Atlas link use kiya hai)
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://pushpendrasinghaniya000a1_db_user:pushpendrasinghaniya000a1_db_user@cluster0.pneliv3.mongodb.net/main";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected Successfully"))
  .catch(err => console.log("❌ DB Connection Error:", err));

// 2. User Schema
const userSchema = new mongoose.Schema({
  _id: String,
  name: String,
  socketId: String
});
const User = mongoose.model("User", userSchema);

// 3. Socket Middleware (Authentication & SocketID Update)
io.use(async (socket, next) => {
  try {
    const { userId, userName } = socket.handshake.auth;
    
    if (!userId) {
      console.log("❌ Auth failed: No userId");
      return next(new Error("Authentication failed"));
    }

    // Har connection par user ka socketId DB mein update hoga
    const user = await User.findOneAndUpdate(
      { _id: userId }, 
      { $set: { name: userName || "User", socketId: socket.id } }, 
      { upsert: true, new: true }
    );

    socket.user = user;
    next();
  } catch (err) {
    console.error("🔥 Middleware Error:", err.message);
    next(new Error("Database Error"));
  }
});

// 4. Socket Events
io.on("connection", (socket) => {
  console.log(`🚀 ${socket.user.name} joined with ID: ${socket.id}`);

  // Private Message Logic
  socket.on("send-message", async ({ to, content }) => {
    try {
      const receiver = await User.findById(to);
      
      if (receiver && receiver.socketId) {
        console.log(`📩 Message from ${socket.user.name} to ${receiver.name}`);
        
        io.to(receiver.socketId).emit("new-message", {
          sender: socket.user._id, 
          content: content
        });
      } else {
        console.log("⚠️ Receiver not found or offline");
      }
    } catch (err) {
      console.error("❌ Send Error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`👋 ${socket.user.name} disconnected`);
  });
});

// 5. Port Binding (Render ke liye process.env.PORT zaroori hai)
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`📡 Server running on port ${PORT}`));