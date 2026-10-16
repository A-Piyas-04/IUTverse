const logger = require("../utils/logger");

const requestLogger = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    logger.info("request completed", {
      method: req.method,
      path: req.originalUrl || req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
};

module.exports = {
  requestLogger
};
