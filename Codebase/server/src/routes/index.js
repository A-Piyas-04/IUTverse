const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const jobRoutes = require("./jobRoutes");
const lostAndFoundRoutes = require("./lostAndFoundRoutes");
const confessionRoutes = require("./confessionRoutes");
const postRoutes = require("./postRoutes"); // Added post routes
const catPostRoutes = require("./catPostRoutes");
const catQARoutes = require("./catQARoutes");
const chatRoutes = require("./chatRoutes");
const academicResourceRoutes = require("./academicResourceRoutes");

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

// Confession routes
router.use("/api", confessionRoutes);
router.use("/api/lost-and-found", lostAndFoundRoutes);

// Cat Post routes
router.use("/api/cat-posts", catPostRoutes);

// Cat Q&A routes
router.use("/api/cat-qa", catQARoutes);

// Post routes
router.use("/api", postRoutes);

// Chat routes
router.use("/api/chat", chatRoutes);

// Academic Resource routes
router.use("/api/academic", academicResourceRoutes);

module.exports = router;
