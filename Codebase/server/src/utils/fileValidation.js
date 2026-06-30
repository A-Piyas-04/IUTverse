const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const pdfMimeTypes = new Set(["application/pdf"]);

const signatures = [
  {
    mimeType: "image/jpeg",
    extension: ".jpg",
    matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    mimeType: "image/png",
    extension: ".png",
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  {
    mimeType: "image/webp",
    extension: ".webp",
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP",
  },
  {
    mimeType: "image/gif",
    extension: ".gif",
    matches: (buffer) =>
      buffer.length >= 6 &&
      ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii")),
  },
  {
    mimeType: "application/pdf",
    extension: ".pdf",
    matches: (buffer) => buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-",
  },
];

const allowedForBucket = (bucket) => {
  if (bucket === "academic-resources") return pdfMimeTypes;
  if (bucket === "chat-attachments") return new Set([...imageMimeTypes, ...pdfMimeTypes]);
  return imageMimeTypes;
};

const detectFileType = (buffer) =>
  signatures.find((signature) => signature.matches(buffer || Buffer.alloc(0))) || null;

const publicFileError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.isPublic = true;
  return error;
};

const isAllowedImageMime = (mimeType) => imageMimeTypes.has(String(mimeType || "").toLowerCase());

const isAllowedPdfMime = (mimeType) => pdfMimeTypes.has(String(mimeType || "").toLowerCase());

const validateUploadedFile = (file, { bucket, allowedMimeTypes = allowedForBucket(bucket) } = {}) => {
  if (!file) return null;
  if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw publicFileError("Uploaded file is empty or invalid");
  }

  const detected = detectFileType(file.buffer);
  if (!detected || !allowedMimeTypes.has(detected.mimeType)) {
    throw publicFileError("Uploaded file content does not match an allowed file type");
  }

  const declaredMime = String(file.mimetype || "").toLowerCase();
  if (declaredMime && declaredMime !== detected.mimeType) {
    throw publicFileError("Uploaded file content does not match its declared content type");
  }

  return detected;
};

module.exports = {
  detectFileType,
  imageMimeTypes,
  isAllowedImageMime,
  isAllowedPdfMime,
  pdfMimeTypes,
  validateUploadedFile,
};
