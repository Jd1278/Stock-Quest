// Reuse Express without opening a persistent HTTP listener on Vercel
module.exports = require("../backend/dist/app.js").app;
