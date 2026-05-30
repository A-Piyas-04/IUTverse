const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { requestLogger } = require("./middleware/logging");
const {
  apiLimiter,
  corsGuard,
  corsOptions,
  helmetMiddleware,
} = require("./middleware/security");
const { badRequest, payloadTooLarge, serverError } = require("./utils/responses");
const logger = require("./utils/logger");

const app = express();

const sanitizeProductionErrors = (req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (process.env.NODE_ENV === "production" && res.statusCode >= 500) {
      return json({
        success: false,
        message: "Internal server error",
      });
    }

    return json(body);
  };
  next();
};

// Middleware
app.disable("x-powered-by");
app.use(helmetMiddleware);
app.use(sanitizeProductionErrors);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(corsGuard);
app.use(cors(corsOptions));
app.use("/api", apiLimiter);

// Add logging middleware
app.use(requestLogger);

// Routes
app.use("/", routes);

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err?.type === "entity.too.large") {
    return payloadTooLarge(res, "Request body too large");
  }

  if (err instanceof SyntaxError && err?.type === "entity.parse.failed") {
    return badRequest(res, "Malformed JSON request body");
  }

  if (err?.isPublic && err?.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  logger.error("Unhandled request error", err);
  return serverError(res, "Unexpected server error", err.message);
});

module.exports = app;
