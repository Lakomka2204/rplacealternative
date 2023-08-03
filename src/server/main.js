const express = require("express");
const ViteExpress = require("vite-express");
const { createServer } = require("vite");
const mongose = require("mongoose");
const morgan = require("morgan");
const path = require("path");
const socket = require("socket.io");
const { createIOServer } = require("./io");
const http = require("http");
const cp = require("cookie-parser");
require("dotenv").config();
const app = express();
mongose
  .connect(process.env.MONGOURL, { useNewUrlParser: true })
  .then((db) => console.log("MongoDB connected.", db.connection.name))
  .catch((error) => console.error("MongoDB error", error));
app.use(cp());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("tiny"));
app.use("/auth", require("./routes/auth"));
app.use("/pixels", require("./routes/pixels"));
app.use("/users", require("./routes/users"));
app.use("/admin", require("./routes/admin"));
const port = process.env.PORT || 3000;
  ViteExpress.config({mode:process.env.NODE_ENV || 'production'});
  async function createMainServer() {
    const server = http.createServer(app);
    createIOServer(server);
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: "spa",
      mode: process.env.NODE_ENV || 'development'
    });
    app.use(vite.middlewares);
    server.listen(port, () => {
      console.log("Server is listening on port %d...", port);
    });
  }
  createMainServer();
