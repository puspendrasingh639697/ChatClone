const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Message = require("./models/Message");
const connectDB = require("./config/database");
const authRoutes = require("./routes/authRoutes"); // Route import
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// Database Connection
connectDB();

// 🔴 ROUTES CONNECTION (Sahi jagah)
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.send("Chat Server is Running Successfully!");
});

// --- Socket.io Middleware ---
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Auth error"));
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.id);
        if (user) {
            socket.user = user;
            next();
        } else {
            next(new Error("User not found"));
        }
    } catch (err) {
        next(new Error("Invalid Token"));
    }
});

io.on("connection", (socket) => {
    console.log(`⚡ Connected: ${socket.user.name}`);
    
    socket.on("send-message", async ({ to, content }) => {
        const newMessage = new Message({ sender: socket.user._id, receiver: to, content });
        await newMessage.save();
        const recipient = await User.findById(to);
        if (recipient && recipient.socketId) {
            io.to(recipient.socketId).emit("new-message", {
                senderId: socket.user._id,
                content
            });
        }
    });

    socket.on("disconnect", () => {
        console.log("❌ User disconnected");
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server live on port ${PORT}`));