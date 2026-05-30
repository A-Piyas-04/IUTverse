const app = require('./src/app');
const config = require('./src/config/config');
const logger = require("./src/utils/logger");

const PORT = config.port;
const SHUTDOWN_TIMEOUT_MS = 10000;

const server = app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
  logger.info("IUTVerse backend ready");
  logger.info(`Environment: ${config.nodeEnv}`);
});

const shutdown = (signal) => {
  logger.info(`Received ${signal}; closing HTTP server`);

  const timeout = setTimeout(() => {
    logger.error("Graceful shutdown timed out; forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  server.close((error) => {
    clearTimeout(timeout);
    if (error) {
      logger.error("HTTP server failed to close cleanly", error);
      process.exit(1);
    }

    logger.info("HTTP server closed cleanly");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
