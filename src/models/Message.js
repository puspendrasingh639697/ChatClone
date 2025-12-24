const mongoose = require("mongoose");
const MessageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  content: String
}, { timestamps: true });
module.exports = mongoose.model("Message", MessageSchema);