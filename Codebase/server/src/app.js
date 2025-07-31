const express = require("express");
const cors = require("cors");
const path = require("path");
const routes = require("./routes");
const { requestLogger } = require("./middleware/logging");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(cors());

// Serve static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/files", express.static(path.join(__dirname, "../uploads")));

// Add logging middleware
app.use(requestLogger);

// Routes
app.use("/", routes);

module.exports = app;
