const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const defaultLevel = process.env.NODE_ENV === "production" ? "warn" : "info";
const configuredLevel = String(process.env.LOG_LEVEL || defaultLevel).toLowerCase();
const activeLevel = levels[configuredLevel] ?? levels[defaultLevel];

const serializeMeta = (meta) => {
  if (meta === undefined) return "";
  if (meta instanceof Error) {
    return ` ${JSON.stringify({
      name: meta.name,
      message: meta.message,
      stack: process.env.NODE_ENV === "production" ? undefined : meta.stack,
    })}`;
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return " [unserializable metadata]";
  }
};

const write = (level, message, meta) => {
  if (levels[level] > activeLevel) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${message}${serializeMeta(meta)}`;
  const stream = level === "error" ? console.error : console.log;
  stream(line);
};

module.exports = {
  error: (message, meta) => write("error", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  info: (message, meta) => write("info", message, meta),
  debug: (message, meta) => write("debug", message, meta),
};
