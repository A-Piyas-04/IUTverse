const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Results are `{ ok: true, value }` or `{ ok: false, error }`, so callers narrow with `if (!r.ok)`.
export type Valid<T> = { ok: true; value: T; error?: undefined };
export type Invalid = { ok: false; error: string; value?: undefined };
export type Checked<T> = Valid<T> | Invalid;

export interface TextOptions {
  max?: number;
  min?: number;
  collapseWhitespace?: boolean;
}

const stripHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ");

export const sanitizePlainText = (value: unknown, { max = 5000, collapseWhitespace = true }: TextOptions = {}) => {
  const stripped = stripHtml(value);
  const normalized = collapseWhitespace ? stripped.replace(/\s+/g, " ").trim() : stripped.trim();
  return normalized.slice(0, max);
};

export const sanitizePlainTextArray = (value: unknown, options: TextOptions = {}) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => sanitizePlainText(item, options)).filter(Boolean);
};

export const optionalText = (value: unknown, options: TextOptions = {}) => {
  if (value === undefined || value === null) return null;
  const text = sanitizePlainText(value, options);
  return text || null;
};

export const requiredText = (value: unknown, label: string, options: TextOptions = {}): Checked<string> => {
  const text = sanitizePlainText(value, options);
  if (!text) {
    return { ok: false, error: `${label} is required` };
  }
  const min = options.min || 1;
  if (text.length < min) {
    return { ok: false, error: `${label} must be at least ${min} characters long` };
  }
  return { ok: true, value: text };
};

export const positiveInt = (value: unknown, label: string): Checked<number> => {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    return { ok: false, error: `${label} must be a positive integer` };
  }
  return { ok: true, value: number };
};

export const uuid = (value: unknown, label = "ID"): Checked<string> => {
  const text = String(value || "");
  if (!UUID_RE.test(text)) {
    return { ok: false, error: `${label} must be a valid UUID` };
  }
  return { ok: true, value: text };
};

export const enumValue = (value: unknown, allowed: readonly string[], label: string): Checked<string> => {
  const text = sanitizePlainText(value, { max: 100 }).toLowerCase();
  if (!allowed.includes(text)) {
    return { ok: false, error: `${label} must be one of: ${allowed.join(", ")}` };
  }
  return { ok: true, value: text };
};

export const enumValueExact = (value: unknown, allowed: readonly string[], label: string): Checked<string> => {
  const text = sanitizePlainText(value, { max: 100 }).toUpperCase();
  if (!allowed.includes(text)) {
    return { ok: false, error: `${label} must be one of: ${allowed.join(", ")}` };
  }
  return { ok: true, value: text };
};

// Text for a PostgREST or=(...) ilike filter. Commas, parentheses, quotes and
// backslashes are filter syntax there, so they are replaced with spaces.
export const filterSearchTerm = (value: unknown) => String(value ?? "").replace(/[,()"\\]/g, " ").trim();

export const pagination = (page: unknown = 1, limit: unknown = 20, maxLimit = 100) => {
  const safePage = Math.max(parseInt(String(page), 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), maxLimit);
  return { page: safePage, limit: safeLimit };
};
