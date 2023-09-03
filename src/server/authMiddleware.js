const jwt = require("jsonwebtoken");
const User = require("./models/user");

module.exports = (req, res, next) => {
  const token = req.header("Authorization") ?? req.cookies["u"];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, process.env.JWTSECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    const tokenUser = await User.findById(user.id);
    if (tokenUser.ban?.duration?.getTime() <= Date.now()) {
      tokenUser.ban.isBanned = false;
      tokenUser.ban.reason = null;
      await tokenUser.save();
    }
    if (!tokenUser) return res.status(404).json({ error: "No user" });
    if (tokenUser.isDeleted) return res.status(404).json({ error: "No user" });
    if (tokenUser.ban.isBanned)
      return res
        .status(401)
        .json({ error: "You are banned. Reason: " + tokenUser.ban.reason });
    if (tokenUser.password != user.pwd)
      return res.status(403).json({ error: "Password mismatch." });
    req.user = user;
    next();
  });
};
