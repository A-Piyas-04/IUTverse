const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

type Level = keyof typeof levels;

const defaultLevel: Level = process.env.NODE_ENV === "production" ? "warn" : "info";
const configuredLevel = String(process.env.LOG_LEVEL || defaultLevel).toLowerCase();
const activeLevel = levels[configuredLevel as Level] ?? levels[defaultLevel];

const serializeMeta = (meta: unknown) => {
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

const write = (level: Level, message: string, meta?: unknown) => {
  if (levels[level] > activeLevel) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${message}${serializeMeta(meta)}`;
  const stream = level === "error" ? console.error : console.log;
  stream(line);
};

const logger = {
  error: (message: string, meta?: unknown) => write("error", message, meta),
  warn: (message: string, meta?: unknown) => write("warn", message, meta),
  info: (message: string, meta?: unknown) => write("info", message, meta),
  debug: (message: string, meta?: unknown) => write("debug", message, meta),
};

export default logger;
