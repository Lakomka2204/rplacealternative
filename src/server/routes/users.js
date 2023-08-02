const { Router } = require("express");
const router = Router();
const authmiddle = require("../authMiddleware");
const User = require("../models/user");
router.get("/me", authmiddle, async (req, res) => {
  const dbUser = await User.findById(req.user.id);
  if (!dbUser)
    return res
      .status(404)
      .json({ error: `User with id ${req.user.id} not found.` });
  res.json({
    id: dbUser._id,
    email: dbUser.email,
    role: dbUser.privileges,
    username: dbUser.username,
    createdAt: dbUser.createdAt,
    emailVerified: dbUser.emailVerified,
    isBanned: dbUser.ban.isBanned,
    cooldown: dbUser.placeCooldown,
  });
});
router.get("/myrole", authmiddle, async (req, res) => {
  const dbUser = await User.findById(req.user.id);
  res.json({ role: dbUser.privileges });
});
router.get("/myid", authmiddle, async (req, res) => {
  const dbUser = await User.findById(req.user.id);
  res.json({ id: dbUser._id });
});
router.get("/mycd", authmiddle, async (req, res) => {
  const dbUser = await User.findById(req.user.id);
  res.json({ cd: dbUser.placeCooldown });
});
router.get("/user", authmiddle, async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: "No id." });
  const targUser = await User.findById(id);
  if (!targUser) return res.status(404).json({ error: "No user" });
  res.json({
    id: targUser._id,
    role: targUser.privileges,
    username: targUser.username,
    createdAt: targUser.createdAt,
    isBanned: targUser.ban.isBanned,
  });
});
module.exports = router;
