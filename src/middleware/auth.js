const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const userId = req.headers["x-user-id"];
    const userName = req.headers["x-user-name"];

    if (!userId || !userName) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let user = await User.findById(userId);

    if (!user) {
      user = await User.create({ _id: userId, name: userName });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Auth failed" });
  }
};
