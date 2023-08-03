const ViteExpress = require("vite-express");
require('dotenv').config();
ViteExpress.config({mode:process.env.NODE_ENV});
ViteExpress.build();