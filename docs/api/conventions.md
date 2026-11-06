# API conventions

What the API does today, as read from the code and pinned by `tests/server/contract-*.test.ts`. Items under **Proposed** are
not implemented.

## Authentication

* `Authorization: Bearer <Supabase access token>` on every protected route (`authenticateToken`).
* Missing token: **401**, `code: AUTH_TOKEN_REQUIRED`.
* Invalid or expired token: **403**, `code: AUTH_TOKEN_INVALID` (the status is 403, not 401; kept for web compatibility).
* Valid session but not an active member: **403**, `code: MEMBERSHIP_REQUIRED`.
* Role or ownership failures: 403 without a `code`.
* Some routes use `optionalAuth` (anonymous allowed, richer data when signed in); `security: [{}, {bearerAuth: []}]` in the contract.

Clients: on `AUTH_TOKEN_INVALID` refresh the session once and retry; on `MEMBERSHIP_REQUIRED` stop and show the membership message.

## Success bodies

There are three shapes in use; each operation's response schema says which:

1. **Envelope**: `{ "success": true, "data": ..., "message"?: string, "pagination"?: {...} }` (most routes; `success()`/`created()` in `src/server/http/responses.ts`).
2. **Bare object**: `{ "message": ... }` or the resource itself (for example `GET /api/profile/{userId}`, `GET /api/auth/validate`, picture uploads).
3. **Route-specific**: extra keys beside `success` (for example `PostReactResponse.action`).

## Error bodies

`{ "success": false, "message": string, "code"?: string }`. Some controllers omit `success`; `message` is always present. 5xx
bodies in production are always `{ "success": false, "message": "Internal server error" }`. `error` (internal detail) appears
only when `EXPOSE_ERRORS=true` outside production. `code` is currently emitted only by authentication; clients must treat
unknown or absent codes as a generic error of the HTTP status.

| Status | Meaning |
|---|---|
| 400 | Validation failure or malformed id/body (JSON bodies are limited to 1 MB: 413) |
| 401 / 403 | See Authentication |
| 404 | Missing, or hidden from the caller |
| 409 | Duplicate/conflict |
| 429 | Rate limit; `Retry-After` and `RateLimit-*` headers |
| 409 `IDEMPOTENCY_KEY_REUSED`, 400 `IDEMPOTENCY_KEY_INVALID` | See Idempotency |
| 5xx | Server or upstream failure |

## Request ids

Send `X-Request-Id` (8 to 128 characters of `A-Z a-z 0-9 . _ : -`). The server echoes it on every response produced by a route
handler, or generates a UUID when the header is absent or unsafe, and logs it with the request. Responses produced before the
route runs (CORS rejection by `proxy.ts`) do not carry it.

## Client headers (optional, diagnostic)

`X-Client-Platform` (`web`, `android`, `ios`) and `X-Client-Version` (`MAJOR.MINOR.PATCH`, optionally `+BUILD`) are logged with the request id.
Invalid values are ignored, not rejected. They are never used for authorization. Details: [../mobile-integration/transport.md](../mobile-integration/transport.md).

## Idempotency

`Idempotency-Key` makes retries of three creates safe (chat messages, posts, comments); a retry returns the original resource with
`Idempotent-Replayed: true`, and reuse with different content is `409 IDEMPOTENCY_KEY_REUSED`. See [idempotency.md](idempotency.md).

## Identifiers

* Members: UUID strings. Content (posts, comments, jobs, events, conversations, messages, resources, ...): positive integers.
  Serialize as JSON numbers; they stay well below 2^53.
* Identifiers are stable and never reused. Anonymous content reports `userId`/`authorId: null`.

## Timestamps

ISO 8601 strings as PostgREST returns `timestamptz`. Parse with a standards-compliant ISO parser and treat the value as an
instant; do not assume a trailing `Z` or a particular fractional precision. Dates without time (for example `deadline`) are
documented per operation when they appear.

## Nullability

Unknown values are `null` (the field is present). Fields documented without `nullable` are always present. Clients must also
tolerate a missing optional field. Empty collections are `[]`, not `null`.

## Enums

Strings. Clients must tolerate values they do not know (treat as "unknown") because new values are a MINOR change.

## Pagination

Offset pagination with `?page=` (1-based) and `?limit=`. The server clamps out-of-range values instead of rejecting them. The
default and maximum `limit` differ per route (defaults 10 to 20, maximums 50 or 100). Metadata is `pagination: { page, limit,
totalPages, total | totalPosts | totalComments }`; read whichever total key is present. Lists are sorted newest first unless the
operation says otherwise. There is no cursor pagination.

## Uploads

Two ways, for routes that accept files:

1. **Direct**: `POST /api/uploads` returns a signed Storage upload (`path`, `token`, `signedUrl`); upload the bytes to Storage,
   then call the target route with `uploadPath` set to `path`.
2. **Multipart** on the target route (field `image`, `profilePicture`, `coverPicture`, `pdf` or `attachment`, per operation) for small files.

Limits are enforced by purpose (avatar 2 MB, cover/post/lost-and-found/cat/event 5 MB, resource 10 MB, chat 10 MB and 50 MB for
video) and by magic bytes; see `docs/mobile-integration/uploads.md`.

## Files and redirects

`GET /api/chat/attachments/{messageId}`, `GET /api/academic/resources/{id}/file` and the picture endpoints answer **302** to a
signed or public URL. Signed URLs expire (chat message payloads: one hour; the id-based endpoints: five minutes). The first two also
accept `?redirect=false` and then answer JSON `{ url, expiresAt }` with the same authorization, for clients that should not depend
on redirects. Every call signs a new URL. Media URL formats and rules: [../mobile-integration/media.md](../mobile-integration/media.md).

## Rate limits

Fixed windows per client address (general, writes, credentials, lookups), with draft-6 `RateLimit-*` headers and `Retry-After`
on 429. Read operations are not retried automatically by the contract; clients decide.

## Versioning

The URL prefix is `/api` and is not versioned. The contract version is `info.version` (see
[compatibility-policy.md](compatibility-policy.md)). `/api/v1` is introduced only when a breaking change cannot be additive.

## Proposed (not implemented)

* A single error shape with `error.code`, `details` and `requestId` in the body.
* A single envelope and a single pagination shape, behind a new contract MAJOR.
* Per-user rate limits for authenticated routes.
