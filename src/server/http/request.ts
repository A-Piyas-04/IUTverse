import type { NextRequest } from "next/server";
import { PublicError } from "./errors";
import type { ApiContext, UploadedFile } from "./context";

export const JSON_BODY_LIMIT = 1024 * 1024;

const fieldsToObject = (entries: Iterable<[string, FormDataEntryValue]>) => {
  const fields: Record<string, any> = {};
  for (const [key, value] of entries) {
    if (typeof value !== "string") continue;
    // A repeated name becomes an array, like multer and the urlencoded parser.
    if (key in fields) fields[key] = Array.isArray(fields[key]) ? [...fields[key], value] : [fields[key], value];
    else fields[key] = value;
  }
  return fields;
};

/** The query string as Express parses it: repeated keys become arrays. */
export const parseQuery = (url: URL) => {
  const query: Record<string, string | string[]> = {};
  for (const [key, value] of url.searchParams) {
    const existing = query[key];
    if (existing === undefined) query[key] = value;
    else query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return query;
};

/**
 * Reads the request body without ever holding more than `limit` bytes. Rejects
 * on the declared length first, then on the bytes actually received (chunked
 * bodies declare nothing).
 */
export const readLimited = async (request: Request, limit: number, tooLarge: () => PublicError): Promise<Buffer> => {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) throw tooLarge();
  if (!request.body) return Buffer.alloc(0);

  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > limit) {
      // Not awaited: the platform may hand us one branch of a tee()'d stream,
      // and cancelling one branch does not settle until the other is cancelled.
      void reader.cancel().catch(() => {});
      throw tooLarge();
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
};

const contentType = (request: Request) => (request.headers.get("content-type") || "").toLowerCase();

export const isJson = (request: Request) => /^application\/json(\s*;|$)/.test(contentType(request));
export const isUrlencoded = (request: Request) => /^application\/x-www-form-urlencoded(\s*;|$)/.test(contentType(request));
export const isMultipart = (request: Request) => /^multipart\/form-data(\s*;|$)/.test(contentType(request));

const bodyTooLarge = () => new PublicError("Request body too large", 413);

/**
 * `express.json()` and `express.urlencoded()` with a 1 MB limit: JSON must be
 * an object or array, an empty body is `{}`, anything malformed is a 400.
 * Other content types (multipart is read by a route's own step) are left alone.
 */
export const parseBody = async (request: NextRequest): Promise<Record<string, any>> => {
  const json = isJson(request);
  const form = isUrlencoded(request);
  if (!json && !form) return {};

  const text = (await readLimited(request, JSON_BODY_LIMIT, bodyTooLarge)).toString("utf8");
  if (!text.trim()) return {};

  if (form) return fieldsToObject(new URLSearchParams(text));

  const first = text.trimStart()[0];
  if (first !== "{" && first !== "[") throw new PublicError("Malformed JSON request body", 400);
  try {
    return JSON.parse(text);
  } catch {
    throw new PublicError("Malformed JSON request body", 400);
  }
};

export interface MultipartSpec {
  /** The only field name that may carry a file. */
  field: string;
  maxBytes: number;
  /** Human size for messages, e.g. "5MB". */
  maxLabel: string;
  /** Rejects a file by its declared type; omit to accept any type here. */
  accept?: (mimeType: string) => boolean;
  /** Names the kind of file in "Only <kind> files are allowed." */
  kind?: string;
}

// Room for the text fields that travel with a file.
const MULTIPART_OVERHEAD = 1024 * 1024;

/**
 * What `multer.single(field)` did: parse a multipart body into text fields and
 * at most one in-memory file, with multer's limits and error messages. A
 * request that is not multipart is left for the JSON parser.
 */
export const parseMultipart = async (request: NextRequest, spec: MultipartSpec): Promise<{ fields: Record<string, any>; file?: UploadedFile } | null> => {
  if (!isMultipart(request)) return null;

  const tooLarge = () => new PublicError(`File too large. Maximum size is ${spec.maxLabel}.`, 400);
  const raw = await readLimited(request, spec.maxBytes + MULTIPART_OVERHEAD, tooLarge);

  let form: FormData;
  try {
    form = await new Response(new Uint8Array(raw), { headers: { "content-type": request.headers.get("content-type") || "" } }).formData();
  } catch {
    throw new PublicError("Malformed multipart request body", 400);
  }

  let file: UploadedFile | undefined;
  for (const [name, value] of form.entries()) {
    if (typeof value === "string") continue;
    // A file input left empty still sends a nameless, zero-byte part.
    if (!value.name && value.size === 0) continue;
    if (name !== spec.field || file) throw new PublicError("Unexpected field name for file upload.", 400);
    if (spec.accept && !spec.accept(value.type)) throw new PublicError(`Only ${spec.kind ?? "file"} files are allowed.`, 400);
    if (value.size > spec.maxBytes) throw tooLarge();
    file = {
      fieldname: name,
      originalname: value.name,
      mimetype: value.type,
      size: value.size,
      buffer: Buffer.from(await value.arrayBuffer()),
    };
  }

  return { fields: fieldsToObject(form.entries()), file };
};

/** The route step form of `parseMultipart`. */
export const multipartStep = (spec: MultipartSpec) => async (ctx: ApiContext) => {
  const parsed = await parseMultipart(ctx.request, spec);
  if (!parsed) return;
  ctx.body = parsed.fields;
  if (parsed.file) ctx.file = parsed.file;
};
