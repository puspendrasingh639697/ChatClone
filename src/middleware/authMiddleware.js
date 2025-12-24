module.exports = async (req, res, next) => {
  try {
    const userId = req.headers["x-user-id"];
    const userName = req.headers["x-user-name"];
    const projectId = req.headers["x-project-id"];

    if (!userId || !userName || !projectId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = {
      _id: userId,
      name: userName,
      projectId
    };

    next();
  } catch (err) {
    res.status(401).json({ message: "Auth failed" });
  }
};
