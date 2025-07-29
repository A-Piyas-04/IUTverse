const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const jobRoutes = require("./jobRoutes");
const lostAndFoundRoutes = require("./lostAndFoundRoutes");
const confessionRoutes = require("./confessionRoutes");
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const lostAndFoundRoutes = require('./lostAndFoundRoutes');
const catPostRoutes = require('./catPostRoutes');
const catQARoutes = require('./catQARoutes');

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
router.use('/api/lost-and-found', lostAndFoundRoutes);

// Cat Post routes
router.use('/api/cat-posts', catPostRoutes);

// Cat Q&A routes
router.use('/api/cat-qa', catQARoutes);

module.exports = router;
