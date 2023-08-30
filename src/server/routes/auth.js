const { Router } = require("express");
const router = Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { default: axios } = require("axios");
const { URLSearchParams} = require('url')
const User = require("../models/user");
router.post('/discord', async (req,res) => {
  try{
  const {code} = req.body;
  if (!code)
    return res.status(404).json({error: 'No authorization code'});
const tokenData = new URLSearchParams({
  client_id: process.env.DISCORD_CLIENT_ID,
  client_secret: process.env.DISCORD_CLIENT_SECRET,
  code: code.toString(),
  grant_type: 'authorization_code',
  redirect_uri: process.env.LOCAL_REDIRECT,
});
const authData = await axios.post('https://discord.com/api/oauth2/token',tokenData,
{headers:{
  'Content-Type': 'application/x-www-form-urlencoded'
}});
if (authData.data)
{
  const accessToken = authData.data.access_token;
  const userInfo = await axios.get('https://discord.com/api/v10/users/@me',{
    headers:{
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const {id,username,email} = userInfo.data;
  const user = await User.findOne({discordId: id});
  let token;
  if (user)
    token = jwt.sign({id:user._id,email: user.email,pwd: user.password},process.env.JWTSECRET);
  else
  {
    const newUser = new User({
      discordId: id,
      username,
      email,
      emailVerified:true,
      password:jwt.sign({access_token:accessToken,refresh_token: authData.data.refresh_token},process.env.JWTSECRET),
    });
    await newUser.save();
    token = jwt.sign({id: newUser._id,email: newUser.email,pwd:newUser.password});
  }
  if (token)
    res.header("Authorization",token);
  res.json({username});
}
  }
  catch(err){
    console.error("discord auth error",err);
    res.status(500).json({error:"ISE"});
  }
});
router.get('/discord',(_req,res) => {
  res.redirect(process.env.DISCORD_REDIRECT);
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ error: "Invalid username or password" });
    const passMatch = await bcrypt.compare(password, user.password);
    if (!passMatch)
      return res.status(401).json({ error: "Invalid username or password" });
      if (user.ban.isBanned)
      return res.status(401).json({error: "You are banned. Reason: "+user.ban.reason});
    const token = jwt.sign({ id: user._id, email: user.email, pwd: user.password },process.env.JWTSECRET);
    res.header('Authorization',token);
    res.json({ username:user.username });
  } catch (err) {
    console.error("login error", err);
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