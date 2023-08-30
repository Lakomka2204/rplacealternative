const { Router } = require("express");
const router = Router();
const jwt = require("jsonwebtoken");
const { default: axios } = require("axios");
const { URLSearchParams } = require("url");
const User = require("../models/user");
const { google } = require("googleapis");
const googleoauthClient = new google.auth.OAuth2({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.LOCAL_REDIRECT + "google-token/",
});

router.get("/discord-token", async (req, res) => {
  try {
    const { code, error, error_description } = req.query;
    if (error) return res.status(401).json({ error: error_description });
    if (!code) return res.status(400).json({ error: "No authorization code" });
    const tokenData = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      code: code.toString(),
      grant_type: "authorization_code",
      redirect_uri: process.env.LOCAL_REDIRECT + "discord-token/",
    });
    const authData = await axios.post(
      "https://discord.com/api/oauth2/token",
      tokenData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    if (authData.data) {
      const accessToken = authData.data.access_token;
      const userInfo = await axios.get(
        "https://discord.com/api/v10/users/@me",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const { id, username, email } = userInfo.data;
      const user = await User.findOne({ discordId: id });
      let token;
      if (user)
      {
        if (user.ban.isBanned)
        {
          const redirParams = new URLSearchParams({ error: "You are banned. Reason: " + user.ban.reason });
          return res.redirect('/?'+redirParams.toString());
        }
        token = jwt.sign(
          { id: user._id, email: user.email, pwd: user.password },
          process.env.JWTSECRET
          );
        }
      else {
        const newUser = new User({
          discordId: id,
          username,
          email,
          emailVerified: true,
          password: jwt.sign(
            {
              access_token: accessToken,
              refresh_token: authData.data.refresh_token,
            },
            process.env.JWTSECRET
          ),
        });
        await newUser.save();
        token = jwt.sign(
          {
            id: newUser._id,
            email: newUser.email,
            pwd: newUser.password,
          },
          process.env.JWTSECRET
        );
      }

      if (token)
        res.cookie("u", token, {
          sameSite: "strict",
          maxAge: 1000 * 60 * 60 * 24 * 7,
        });
      const redirParams = new URLSearchParams({
        lu: username,
        lm: "discord",
      });
      res.redirect("/?" + redirParams.toString());
    }
  } catch (err) {
    console.error("discord auth error", err);
    const redirParams = new URLSearchParams({
      error: "Could not login with Discord account.",
    });
    res.redirect("/?" + redirParams.toString());
  }
});
router.get("/discord", (_req, res) => {
  res.redirect(process.env.DISCORD_REDIRECT);
});
router.get("/google-token", async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) return res.status(401).json({ error });
    if (!code) return res.status(400).json({ error: "Code is missing" });
    const {tokens} = await googleoauthClient.getToken(code)
    googleoauthClient.setCredentials(tokens);
    const data = google.oauth2({
      responseType: "json",
      version: "v2",
      auth: googleoauthClient
    });
    const userInfo = await data.userinfo.get();
    console.log("GOOGLE DATA", userInfo.data);
    const { id, email, name } = userInfo.data;
    await googleoauthClient.revokeToken(tokens.access_token);
    const user = await User.findOne({ googleId: id });
    let token;
    if (user)
    {
      if (user.ban.isBanned)
        {
          const redirParams = new URLSearchParams({ error: "You are banned. Reason: " + user.ban.reason });
          return res.redirect('/?'+redirParams.toString());
        }
      token = jwt.sign(
        { id: user._id, email: user.email, pwd: user.password },
        process.env.JWTSECRET
        );
      }
    else {
      const newUser = new User({
        googleId: id,
        username: name,
        email,
        emailVerified: true,
        password: code,
      });
      await newUser.save();
      token = jwt.sign(
        {
          id: newUser._id,
          email: newUser.email,
          pwd: newUser.password,
        },
        process.env.JWTSECRET
      );
    }
    if (token)
        res.cookie('u',token,{
            sameSite: 'strict', maxAge: 1000*60*60*24*7,
        });
        const redirParams = new URLSearchParams({
            lu: name,
            lm: 'google'
        })
        res.redirect('/?'+redirParams.toString());
  } catch (err) {
    console.error("google auth error", err);
    const redirParams = new URLSearchParams({
      error: "Could not login with Google account.",
    });
    res.redirect("/?" + redirParams.toString());
  }
});
router.get("/google", async (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ];
  const authUrl = googleoauthClient.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    include_granted_scopes: true,
  });
  res.redirect(authUrl);
});

module.exports = router;
