const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const jobRoutes = require("./jobRoutes");
const lostAndFoundRoutes = require("./lostAndFoundRoutes");

// Root route
router.get("/", (req, res) => {
  res.send("IUTverse Server is running!");
});

// Auth routes
router.use("/api/auth", authRoutes);

// User routes
router.use("/api", userRoutes);
router.use("/api", jobRoutes);

// Lost and Found routes
router.use("/api/lost-and-found", lostAndFoundRoutes);

module.exports = router;
