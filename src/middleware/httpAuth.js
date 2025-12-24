const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const userName = req.headers['x-user-name'] || "Chat User";

    if (!userId || userId === "null" || userId === "undefined") {
      return res.status(401).json({ error: "Unauthorized: No User ID provided" });
    }

    let user = await User.findById(userId);

    if (!user) {
      user = await User.create({
        _id: userId,
        name: userName,
        phone: "Synced"
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("HTTP Auth Error:", err.message);
    res.status(401).json({ error: "Authentication failed" });
  }
};
