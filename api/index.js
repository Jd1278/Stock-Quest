// Reuse Express without opening a persistent HTTP listener on Vercel from root deployment
module.exports = require("../stock-quest/apps/api/dist/app.js").app;
