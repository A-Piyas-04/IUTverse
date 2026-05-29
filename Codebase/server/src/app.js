const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { requestLogger } = require("./middleware/logging");
const { serverError } = require("./utils/responses");

const app = express();

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cors());

// Add logging middleware
app.use(requestLogger);

// Routes
app.use("/", routes);

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error("Unhandled request error:", err);
  return serverError(res, "Unexpected server error", err.message);
});

module.exports = app;
