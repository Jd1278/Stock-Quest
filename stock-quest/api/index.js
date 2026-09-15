// Reuse Express without opening a persistent HTTP listener on Vercel.
module.exports = require("../apps/api/dist/app.js").app;
