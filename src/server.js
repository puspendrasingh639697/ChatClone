require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" } 
});

// 1. Database Connection
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://pushpendrasinghaniya000a1_db_user:pushpendrasinghaniya000a1_db_user@cluster0.pneliv3.mongodb.net/main";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ DB Error:", err));

// 2. Database Schemas
const userSchema = new mongoose.Schema({
    _id: String,
    mobile_no: String,
    name: String,
    socketId: String
});
const User = mongoose.model("User", userSchema);

// --- NEW: Message Schema to Save Chats ---
const messageSchema = new mongoose.Schema({
    sender: { type: String, ref: 'User' },
    receiver: { type: String, ref: 'User' },
    content: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", messageSchema);

// 3. Socket.io Middleware (Token Decoding)
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Token missing"));

        const decoded = jwt.decode(token);
        if (!decoded) return next(new Error("Invalid Token"));

        const userId = decoded.id || decoded._id || decoded.userId;
        const mobile = decoded.mobile_no || decoded.mobile || decoded.phone || "Unknown";

        const user = await User.findOneAndUpdate(
            { _id: userId },
            { $set: { socketId: socket.id, mobile_no: mobile, name: mobile } },
            { upsert: true, new: true }
        );

        socket.user = user;
        next();
    } catch (err) {
        next(new Error("Auth failed"));
    }
});



// 4. API Routes
app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Users fetch failed" });
    }
});

// --- NEW: Route to Fetch Old Chat History ---
app.get("/api/messages/:user1/:user2", async (req, res) => {
    try {
        const { user1, user2 } = req.params;
        const chats = await Message.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ]
        }).sort({ timestamp: 1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ message: "Error fetching chats" });
    }
});

// 5. Socket Connection Logic
io.on("connection", (socket) => {
    console.log(`🚀 Real User Connected: ${socket.user.mobile_no}`);

    socket.on("send-message", async ({ to, content }) => {
        try {
            // --- SAVE TO DATABASE ---
            const newMessage = new Message({
                sender: socket.user._id,
                receiver: to,
                content: content
            });
            await newMessage.save(); 
            console.log(`💾 Message Saved to DB: ${socket.user.mobile_no} -> ${to}`);

            const receiver = await User.findById(to);
            if (receiver && receiver.socketId) {
                // Receiver ko pura message object bhejo (timestamp ke saath)
                io.to(receiver.socketId).emit("new-message", newMessage);
            }
        } catch (err) {
            console.error("❌ Message Save/Send Error:", err);
        }
    });

    socket.on("disconnect", () => {
        console.log(`👋 User Disconnected: ${socket.user.mobile_no}`);
    });
});

// 6. Start Server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`📡 Server running on http://localhost:${PORT}`);
});