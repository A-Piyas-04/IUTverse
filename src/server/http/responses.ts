const send = (status: number, body: unknown, headers?: HeadersInit) => Response.json(body, { status, headers });

export const success = (data?: unknown, message: string | null = null, extras: Record<string, unknown> = {}) =>
  send(200, {
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
    ...extras,
  });

export const created = (data?: unknown, message: string | null = null, extras: Record<string, unknown> = {}) =>
  send(201, {
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
    ...extras,
  });

// Internal error detail is opt-in for local debugging (EXPOSE_ERRORS=true) and
// never sent in production, so a missing or mistyped NODE_ENV fails closed.
export const exposeInternalErrors = () =>
  process.env.EXPOSE_ERRORS === "true" && process.env.NODE_ENV !== "production";

export const failure = (status: number, message: string, error?: string, extras: Record<string, unknown> = {}) =>
  send(status, {
    success: false,
    message,
    ...(error && exposeInternalErrors() ? { error } : {}),
    ...extras,
  });

export const badRequest = (message: string, extras: Record<string, unknown> = {}) => failure(400, message, undefined, extras);
export const unauthorized = (message = "Unauthorized") => failure(401, message);
export const forbidden = (message = "Forbidden") => failure(403, message);
export const notFound = (message = "Not found") => failure(404, message);
export const conflict = (message = "Conflict") => failure(409, message);
export const payloadTooLarge = (message = "Request body too large") => failure(413, message);
export const serverError = (message = "Internal server error", error?: string) => failure(500, message, error);

/** A JSON response with an arbitrary status, for controllers that return their own envelope. */
export const json = (status: number, body: unknown) => send(status, body);

/** Express's `res.redirect` (302). */
export const redirect = (url: string, status = 302) => Response.redirect(url, status);
