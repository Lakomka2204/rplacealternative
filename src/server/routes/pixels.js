const { Router } = require("express");
const router = Router();
const Pixel = require("../models/pixel");
const User = require("../models/user");
const authmiddleware = require("../authMiddleware");
const path = require('path');
router.get('/canvasinfo',(_req,res)=>{
  const {CVSX,CVSY,PLACECOOLDOWN} = process.env;
  res.json({w:CVSX,h:CVSY, cd:PLACECOOLDOWN});
});
router.get('/canvascolors',(_req,res)=>{
  const colorsFile = path.join(__dirname,'..','colors.json');
  res.sendFile(colorsFile);
});
router.get("/getuser",authmiddleware, async (req, res) => {
  const { x, y } = req.body;
  const pixel = await Pixel.findOne({ position: { x, y } });
  if (!pixel)
    return res
      .status(404)
      .json({
        error: "This pixel hasn't been colored by anyone. Be the first!",
      });
  const placedUser = await User.findById(pixel.placedBy);
  if (!placedUser) return res.status(404).json({ error: "User not found." });
  res.json({
      id: placedUser._id,
  });
});
module.exports = router;