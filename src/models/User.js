// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  _id: String,          // userId (from client project)
  name: String,
  projectId: String,   // 🔥 VERY IMPORTANT
  socketId: String
});

module.exports = mongoose.model("User", userSchema);
