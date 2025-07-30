const jwt = require("jsonwebtoken");
const config = require("../config/config");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      console.log("JWT verification error:", err.message);
      if (err.name === "TokenExpiredError") {
        return res.status(403).json({ message: "Token has expired" });
      }
      return res.status(403).json({ message: "Invalid token" });
    }

    console.log("JWT verified successfully, user payload:", user);
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
