const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Gativyaa ki ID string ban kar yahan aayegi
  name: { type: String, default: "User" },
  socketId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);