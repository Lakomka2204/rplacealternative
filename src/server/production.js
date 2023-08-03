const express = require("express");
const ViteExpress = require("vite-express");
const vite = require("vite");
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
app.use(morgan('short'));
app.use(ViteExpress.static());
app.use("/auth", require("./routes/auth"));
app.use("/pixels", require("./routes/pixels"));
app.use("/users", require("./routes/users"));
app.use("/admin", require("./routes/admin"));
const port = process.env.PORT || 3000;
ViteExpress.config({ mode: 'production' });
const server = http.createServer(app);
app.use(ViteExpress.static());
const ioServer = createIOServer(server);
server.listen(port, () => {
  console.log("PROD Server is listening on port %d...", port);
})
async function startServer() {
  await ViteExpress.bind(app, ioServer);
}
startServer();