import { PublicError } from "../http/errors";

export const imageMimeTypes: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const pdfMimeTypes: ReadonlySet<string> = new Set(["application/pdf"]);
// Chat media. Containers are shared (WebM and MP4 hold audio or video), so
// these are checked against the declared type rather than detected outright.
export const videoMimeTypes: ReadonlySet<string> = new Set(["video/mp4", "video/webm", "video/quicktime"]);
export const audioMimeTypes: ReadonlySet<string> = new Set(["audio/webm", "audio/ogg", "audio/mp4"]);

interface Signature {
  mimeType: string;
  extension: string;
  matches: (buffer: Buffer) => boolean;
}

const signatures: Signature[] = [
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

// ISO base media (MP4, MOV, M4A): a box whose type is "ftyp" right at the start.
const isIsoMedia = (buffer: Buffer) => buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
// Matroska / WebM: the EBML magic number.
const isEbml = (buffer: Buffer) => buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
const isOgg = (buffer: Buffer) => buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS";

// Listed after the single-type signatures, so detectFileType keeps returning
// the same answer for images and PDFs.
signatures.push(
  { mimeType: "video/mp4", extension: ".mp4", matches: isIsoMedia },
  { mimeType: "video/quicktime", extension: ".mov", matches: isIsoMedia },
  { mimeType: "audio/mp4", extension: ".m4a", matches: isIsoMedia },
  { mimeType: "video/webm", extension: ".webm", matches: isEbml },
  { mimeType: "audio/webm", extension: ".weba", matches: isEbml },
  { mimeType: "audio/ogg", extension: ".ogg", matches: isOgg },
);

/** Whether the bytes are a valid start for a file of this declared type. */
export const contentMatchesType = (buffer: Buffer | null | undefined, mimeType: unknown) =>
  signatures.find((signature) => signature.mimeType === String(mimeType || "").toLowerCase())?.matches(buffer || Buffer.alloc(0)) ?? false;

const allowedForBucket = (bucket?: string): ReadonlySet<string> => {
  if (bucket === "academic-resources") return pdfMimeTypes;
  if (bucket === "chat-attachments") return new Set([...imageMimeTypes, ...pdfMimeTypes, ...videoMimeTypes, ...audioMimeTypes]);
  return imageMimeTypes;
};

export const detectFileType = (buffer?: Buffer | null) =>
  signatures.find((signature) => signature.matches(buffer || Buffer.alloc(0))) || null;

export const publicFileError = (message: string) => new PublicError(message, 400);

export const isAllowedImageMime = (mimeType: unknown) => imageMimeTypes.has(String(mimeType || "").toLowerCase());

export const isAllowedPdfMime = (mimeType: unknown) => pdfMimeTypes.has(String(mimeType || "").toLowerCase());

export interface UploadCandidate {
  buffer?: Buffer;
  mimetype?: string;
}

export const validateUploadedFile = (
  file: UploadCandidate | null | undefined,
  { bucket, allowedMimeTypes = allowedForBucket(bucket) }: { bucket?: string; allowedMimeTypes?: ReadonlySet<string> } = {}
) => {
  if (!file) return null;
  if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw publicFileError("Uploaded file is empty or invalid");
  }

  const detected = detectFileType(file.buffer);
  if (!detected || ![...allowedMimeTypes].some((type) => contentMatchesType(file.buffer, type))) {
    throw publicFileError("Uploaded file content does not match an allowed file type");
  }

  const declaredMime = String(file.mimetype || "").toLowerCase();
  if (!declaredMime) return detected;
  if (!allowedMimeTypes.has(declaredMime) || !contentMatchesType(file.buffer, declaredMime)) {
    throw publicFileError("Uploaded file content does not match its declared content type");
  }

  return { mimeType: declaredMime, extension: extensionForMime(declaredMime) || detected.extension };
};

export const extensionForMime = (mimeType: unknown) =>
  signatures.find((signature) => signature.mimeType === String(mimeType || "").toLowerCase())?.extension || null;
