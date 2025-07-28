const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { requestLogger } = require("./middleware/logging");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Add logging middleware
app.use(requestLogger);

// Routes
app.use("/", routes);

module.exports = app;
