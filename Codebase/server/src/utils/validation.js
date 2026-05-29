const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const stripHtml = (value) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\u0000-\u001f\u007f]/g, " ");

const sanitizePlainText = (value, { max = 5000, collapseWhitespace = true } = {}) => {
  const stripped = stripHtml(value);
  const normalized = collapseWhitespace ? stripped.replace(/\s+/g, " ").trim() : stripped.trim();
  return normalized.slice(0, max);
};

const sanitizePlainTextArray = (value, options = {}) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => sanitizePlainText(item, options)).filter(Boolean);
};

const optionalText = (value, options = {}) => {
  if (value === undefined || value === null) return null;
  const text = sanitizePlainText(value, options);
  return text || null;
};

const requiredText = (value, label, options = {}) => {
  const text = sanitizePlainText(value, options);
  if (!text) {
    return { error: `${label} is required` };
  }
  const min = options.min || 1;
  if (text.length < min) {
    return { error: `${label} must be at least ${min} characters long` };
  }
  return { value: text };
};

const positiveInt = (value, label) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    return { error: `${label} must be a positive integer` };
  }
  return { value: number };
};

const uuid = (value, label = "ID") => {
  const text = String(value || "");
  if (!UUID_RE.test(text)) {
    return { error: `${label} must be a valid UUID` };
  }
  return { value: text };
};

const enumValue = (value, allowed, label) => {
  const text = sanitizePlainText(value, { max: 100 }).toLowerCase();
  if (!allowed.includes(text)) {
    return { error: `${label} must be one of: ${allowed.join(", ")}` };
  }
  return { value: text };
};

const enumValueExact = (value, allowed, label) => {
  const text = sanitizePlainText(value, { max: 100 }).toUpperCase();
  if (!allowed.includes(text)) {
    return { error: `${label} must be one of: ${allowed.join(", ")}` };
  }
  return { value: text };
};

const pagination = (page = 1, limit = 20, maxLimit = 100) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), maxLimit);
  return { page: safePage, limit: safeLimit };
};

module.exports = {
  enumValue,
  enumValueExact,
  optionalText,
  pagination,
  positiveInt,
  requiredText,
  sanitizePlainText,
  sanitizePlainTextArray,
  uuid,
};
