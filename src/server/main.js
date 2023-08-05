const express = require("express");
const ViteExpress = require("vite-express");
const { createServer } = require("vite");
const mongose = require("mongoose");
const morgan = require("morgan");
const { createIOServer } = require("./io");
const http = require("http");
const cp = require("cookie-parser");
const ratelimit = require('express-rate-limit');
ratelimit.default({
  windowMs: 10000,
  max: 50,
  message: "Too many requests.",
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,

})
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
app.use("/auth", ratelimit.rateLimit(), require("./routes/auth"));
app.use("/pixels", require("./routes/pixels"));
app.use("/users", require("./routes/users"));
app.use("/admin", require("./routes/admin"));
const mode = process.env?.NODE_ENV?.trim() || "development";
if (!process.env?.NODE_ENV)
  console.warn("Missing NODE_ENV!! Defaulting to development");
const port = process.env.PORT || 3000;
ViteExpress.config({ mode: mode || 'production' });
async function createMainServer() {
  const server = http.createServer(app);
  if (mode == 'production') {
    app.set("trust proxy", "127.0.0.1");
    app.use(ViteExpress.static());
    const ioServer = createIOServer(server);
    server.listen(port, () => {
      console.log("PROD Server is listening on port %d...", port);
    })
    await ViteExpress.bind(app, ioServer);
  }
  else {
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
      console.log("DEV Server is listening on port %d...", port);
    });
  }
}
createMainServer();
