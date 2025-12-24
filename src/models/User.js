const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema({
  _id: String,
  name: String,
  socketId: String
});
module.exports = mongoose.model("User", UserSchema);