require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIo = require("socket.io");

const chatRoutes = require("./routes/chatRoutes");
const connectDB = require("./config/database");
const socketAuth = require("./middleware/socketAuth");

const app = express();
const server = http.createServer(app);

connectDB();

app.use(cors({
  origin: "*",
  allowedHeaders: ["Content-Type", "x-user-id", "x-user-name", "x-project-id"]
}));
app.use(express.json());

app.use("/api/chat", chatRoutes);

const io = socketIo(server, { cors: { origin: "*" } });
io.use(socketAuth);

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.user._id, socket.user.projectId);

  socket.on("send-message", async ({ to, content }) => {
    const Message = require("./models/Message");
    const User = require("./models/User");

    const msg = await Message.create({
      sender: socket.user._id,
      receiver: to,
      projectId: socket.user.projectId,
      content
    });

    const receiver = await User.findById(to);
    if (receiver?.socketId) {
      io.to(receiver.socketId).emit("new-message", msg);
    }
  });

  socket.on("disconnect", async () => {
    const User = require("./models/User");
    await User.findByIdAndUpdate(socket.user._id, {
      socketId: null
    });
  });
});

server.listen(4000, () => console.log("🔥 Chat Backend Ready"));
