const { Router, json } = require("express");
const router = Router();
const authMid = require('../authMiddleware');
const User = require('../models/user');
router.use(authMid);

router.use(async (req,res,next)=>{
    const u = await User.findById(req.user.id);
    if (u.privileges != 'admin')
        return res.sendStatus(403);
    next();
});

router.patch('/resetcooldown',async (req,res) => {
    const uid = req.body.id || req.user.id;
    const user =await User.findById(uid);
    if (!user)
        return res.status(404).json({error:"User not found."});
    user.placeCooldown = new Date();
    await user.save();
    res.status(200).json({message:"Successfully rest cooldown for user "+user.username});
});
router.get('/baninfo',async (req,res) => {
    const id = req.query.id;
    const user = await User.findById(id);
    if (!user)
        return res.status(404).json({error:"User not found."});
    res.json({ban:user.ban});
});
router.patch('/ban',async(req,res) => {
    const {id, reason, time} = req.body;
    const user = await User.findById(id);
    if (!user)
        return res.status(404).json({error:"User not found."});
    if (user.privileges == 'admin')
        return res.status(403).json({error:'User is admin.'});
    if (user.ban.isBanned)
        return res.status(400).json({error:"User is already banned."});
    user.ban = {
        isBanned: true,
        reason: reason,
        duration: new Date(Date.now()+time*1000),
    };
    await user.save();
    res.sendStatus(200);
});
router.patch('/unban',async (req,res) => {
    const {id} = req.body;
    const user = await User.findById(id);
    if (!user)
        return res.status(404).json({error:"User not found."});
    if (!user.ban.isBanned)
        return res.status(400).json({error:"User is already unbanned."});
    user.ban = {
        isBanned: false,
        reason: null,
        duration: null
    };
    await user.save();
    res.status(200).json({message:"Successfully unbanned "+user.username});
});
module.exports = router;