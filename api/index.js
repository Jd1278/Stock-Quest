// Stateless HTTP gateway only. Java services must have reachable HTTPS origins.
const { createApp } = require("../gateway/dist/app.js");
const { readConfig } = require("../gateway/dist/Infrastructure/config.js");
const { HttpServices } = require("../gateway/dist/Infrastructure/HttpServices.js");
const config = readConfig();
module.exports = createApp(config, new HttpServices(config));
