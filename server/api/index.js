// Vercel serverless entry point. vercel.json rewrites every path here, and
// Express routes on the original URL. server.js (app.listen) is for local and
// long-running hosts only.
module.exports = require("../src/app");
