const { Router } = require("express");
const router = Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/user");
router.post("/login", async (req, res) => {
  try {
    if (req.cookies['u'])
      return res.status(400).json({error:"You already logged in."});
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ error: "Invalid username or password" });
      if (user.ban?.duration?.getTime() <= Date.now())
      {
        user.ban.isBanned = false;
        user.ban.reason = null;
      }
    if (user.ban.isBanned)
      return res.status(401).json({error: "You are banned. Reason:"+user.ban.reason});
    const passMatch = await bcrypt.compare(password, user.password);
    if (!passMatch)
      return res.status(401).json({ error: "Invalid username or password" });
    const token = jwt.sign({ id: user._id, email: user.email, pwd: user.password },process.env.JWTSECRET);
    res.header('Authorization',token);
    res.json({ username:user.username });
  } catch (err) {
    console.error("register error", err);
    res.status(500).json({ error: "ISE" });
  }
});
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
    return res.status(400).json({error:'Invalid creds'});
    const existingUsers = await User.find({ email: email });
    if (existingUsers.length > 0)
      return res.status(409).json({ error: "User already exists." });
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const regUser = new User({
      username,
      email,
      password: hashed,
    });
    await regUser.save();
    const token = jwt.sign(
      { id:regUser._id, email: regUser.email, pwd: regUser.password },
      process.env.JWTSECRET
    );
    res.header('Authorization',token);
    res.status(201).json({ username:regUser.username });
  } catch (err) {
    console.error("register error", err);
    res.status(500).json({ error: "ISE" });
  }
});
module.exports = router;