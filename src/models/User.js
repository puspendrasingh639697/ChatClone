const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  profilePic: { type: String, default: 'default.png' },
  isOnline: { type: Boolean, default: false },
  socketId: { type: String, default: null },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);