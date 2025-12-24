const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: String, ref: "User" },
  receiver: { type: String, ref: "User" },
  content: String
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
