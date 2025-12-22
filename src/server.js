const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
// const connectDB = require("./db");
const User = require("./models/User");
const Message = require("./models/Message");
const connectDB = require("./config/database");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
connectDB();

// --- Socket.io Authentication Middleware ---
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Auth error: Token missing"));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (user) {
            socket.user = user; // Socket ke andar user data save kar liya
            next();
        } else {
            next(new Error("Auth error: User not found"));
        }
    } catch (err) {
        next(new Error("Auth error: Invalid Token"));
    }
});

io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`⚡ Connected: ${socket.user.name}`);

    // 1. User ko online mark karein
    await User.findByIdAndUpdate(userId, { isOnline: true, socketId: socket.id });
    io.emit("user-status", { userId, status: "online" });

    // 2. Private Message bhejna
    socket.on("send-message", async ({ to, content }) => {
        try {
            const newMessage = new Message({ sender: userId, receiver: to, content });
            await newMessage.save();

            const recipient = await User.findById(to);
            if (recipient && recipient.socketId) {
                // Real-time delivery
                io.to(recipient.socketId).emit("new-message", {
                    senderId: userId,
                    content,
                    timestamp: newMessage.createdAt
                });
            }
        } catch (error) {
            console.log("Msg Error:", error.message);
        }
    });

    // 3. Typing Indicator (istyping show karna)
    socket.on("typing", ({ to, isTyping }) => {
        User.findById(to).then(recipient => {
            if (recipient && recipient.socketId) {
                io.to(recipient.socketId).emit("display-typing", {
                    from: userId,
                    isTyping
                });
            }
        });
    });

    // 4. Disconnect (Offline status)
    socket.on("disconnect", async () => {
        await User.findByIdAndUpdate(userId, { 
            isOnline: false, 
            lastSeen: new Date(), 
            socketId: null 
        });
        io.emit("user-status", { userId, status: "offline" });
        console.log(`❌ Disconnected: ${socket.user.name}`);
    });
});

// API Route for message history
app.get("/api/messages/:otherId", async (req, res) => {
    // Note: Isme authentication middleware add karein
    const { otherId } = req.params;
    const myId = req.query.myId; // Frontend se bhejien
    const history = await Message.find({
        $or: [
            { sender: myId, receiver: otherId },
            { sender: otherId, receiver: myId }
        ]
    }).sort({ createdAt: 1 });
    res.json(history);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Chat Server live on port ${PORT}`));