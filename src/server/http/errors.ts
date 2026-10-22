// An error whose message is safe to show to the client. The route pipeline
// turns it into `{ success: false, message }` with `statusCode`; anything else
// that escapes a handler becomes a generic 500.
export class PublicError extends Error {
  readonly isPublic = true;

  constructor(message: string, readonly statusCode = 400) {
    super(message);
    this.name = "PublicError";
  }
}

export const isPublicError = (error: unknown): error is PublicError =>
  Boolean(error) && (error as { isPublic?: unknown }).isPublic === true && typeof (error as { statusCode?: unknown }).statusCode === "number";
