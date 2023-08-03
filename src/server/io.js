const {Server} = require("socket.io");
const Pixel = require("./models/pixel");
const User = require("./models/user");
const jwt = require("jsonwebtoken");
const { default: mongoose } = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
function withinrange(value, min, max) {
  return value >= min && value <= max;
}
module.exports = {
  createIOServer: (server) => {
    let availableColors;
    const fpath = path.join(__dirname, "colors.json");
    fs.readFile(fpath, (err, data) => {
      if (err) console.error("Reading colors.json error:", err);
      let colors = JSON.parse(data);
      availableColors = colors.reduce((acc, obj) => {
        acc[obj.color] = obj.name;
        return acc;
      }, {});
    });
    const io = new Server(server, { path: "/ws", serveClient: true});
    io.on("connection", async (socket) => {
      socket.broadcast.emit("online", io.engine.clientsCount);
      const initpixels = await Pixel.find({});
      socket.emit("initdata", {
        online: io.engine.clientsCount,
        pixels: initpixels,
      });
      socket.on("placed", async (a) => {
        try {
          const { token, x, y, color } = a;
          if (!token || !color)
            return socket.emit("placedresult", { msg: "Missing arguments" });
          const jwtres = jwt.verify(token, process.env.JWTSECRET);
          const user = await User.findById(jwtres.id);
          if (user.placeCooldown.getTime() > Date.now())
            return socket.emit("placedresult", {
              msg: "You're on cooldown, wait a little bit.",
            });
            if (user.ban.isBanned)
          {
            return socket.emit("placedresult",{
              msg:"You're banned. Reason: "+user.ban.reason
            })
          }
          if (!availableColors[color])
            return socket.emit("placedresult", { msg: "Invalid color" });
          if (
            !withinrange(x, 0, process.env.CVSX) ||
            !withinrange(x, 0, process.env.CVSY)
          )
            return socket.emit("placedresult", { msg: "Invalid placement" });
          const cooldownDate = new Date(Date.now()+process.env.PLACECOOLDOWN*1000);
          user.placeCooldown = cooldownDate;
          await user.save();
          let pixel = await Pixel.findOne({ "position.x": x, "position.y": y });
          if (pixel) {
            pixel.color = color;
            pixel.placedBy = jwtres.id;
          } else {
            pixel = new Pixel({
              placedBy: jwtres.id,
              position: { x, y },
              color,
            });
          }
          await pixel.save();
          io.emit("placed", pixel);
          socket.emit("placedresult", { msg: "OK" });
        } catch (err) {
          socket.emit("placedresult", { msg: "Invalid token" });
        }
      });
      socket.on("disconnect", () => {
        socket.broadcast.emit("online", io.engine.clientsCount);
      });
    });
    return io;
  },
};
