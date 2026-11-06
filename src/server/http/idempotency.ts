import "server-only";
import { PublicError } from "./errors";
import { failure } from "./responses";

/**
 * Idempotency for retry-prone creates (chat messages, posts, comments). See docs/api/idempotency.md.
 *
 * The client sends `Idempotency-Key: <16 to 64 characters of A-Z a-z 0-9 _ ->` and reuses the SAME key when it
 * retries the same logical action (for example after a timeout). The key is stored with the created row
 * (`client_request_id`) next to its author, and a unique index on (author, key) makes a duplicate impossible even
 * when two retries run at the same time. A retry returns the row that already exists, with `Idempotent-Replayed: true`.
 *
 * The key is a label for the caller's own action, not a credential: it is always checked after authentication and
 * after the normal authorization checks, and it is scoped to the caller, so it cannot reveal or touch anyone else's data.
 */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";
export const REPLAYED_HEADER = "Idempotent-Replayed";
const KEY = /^[A-Za-z0-9_-]{16,64}$/;

export type IdempotencyCode = "IDEMPOTENCY_KEY_INVALID" | "IDEMPOTENCY_KEY_REUSED";

export const keyReusedError = () =>
  new PublicError("This Idempotency-Key was already used for a different request. Use a new key for a new action.", 409, "IDEMPOTENCY_KEY_REUSED");

/** `key` is null when the header is absent (the request then behaves exactly as it always did). */
export const readIdempotencyKey = (headers: Headers): { key: string | null } | { error: Response } => {
  const raw = headers.get("idempotency-key");
  if (raw === null) return { key: null };
  const key = raw.trim();
  if (!KEY.test(key)) {
    return { error: failure(400, "Idempotency-Key must be 16 to 64 characters of letters, digits, underscore or hyphen.", undefined, { code: "IDEMPOTENCY_KEY_INVALID" }) };
  }
  return { key };
};

/** Postgres unique_violation, as PostgREST reports it. */
export const isUniqueViolation = (error: unknown) => (error as { code?: string } | null)?.code === "23505";

/** The response for a PublicError raised by this module when a controller catches errors itself. */
export const publicErrorResponse = (error: PublicError) =>
  failure(error.statusCode, error.message, undefined, error.code ? { code: error.code } : {});
