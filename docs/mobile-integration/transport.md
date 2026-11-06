# Native transport

What a native (React Native) client may rely on when it calls this API, and what the web client keeps doing. The client side
is specified in the mobile repo's `docs/api-transport.md`.

## Web is unchanged

The browser keeps calling the relative `/api` paths of its own origin with `Authorization: Bearer` from the Supabase session.
Nothing in this phase changes web routes, response shapes, cookies, redirects or CORS. The only differences a browser can
observe are additive: an `X-Request-Id` response header, a `code` field on authentication errors, and the optional new request
headers below.

## Origin

* The API is reached at an **absolute HTTPS origin** per environment (for example `https://<host>`). Contract paths already begin
  with `/api`.
* Plain `http` exists only for local development, and only from a development build.
* `localhost` on a phone is the phone. For a local Docker stack use the computer's LAN address (or a tunnel), and make sure
  `SUPABASE_PUBLIC_URL` is set to an address the phone can reach, because Storage URLs returned by the API are built from it.
  Emulators differ: the Android emulator reaches the host at `10.0.2.2`; the iOS simulator shares the host's `localhost`.
* Native requests send no `Origin` header, so CORS does not apply and nothing was relaxed for them.

## Headers

| Header | Direction | Meaning |
|---|---|---|
| `Authorization: Bearer <access token>` | request | Required on protected routes. Never send it to a Storage URL. |
| `X-Request-Id` | request, response | Correlation id. Send 8 to 128 characters of `A-Za-z0-9._:-`; the server echoes it, or generates one. Keep the same id across retries of one request. |
| `X-Client-Platform` | request, optional | `web`, `android` or `ios`. Anything else is ignored. |
| `X-Client-Version` | request, optional | `MAJOR.MINOR.PATCH` with an optional `+BUILD`, for example `1.4.0+57`. Anything else is ignored. |
| `Idempotency-Key` | request, optional | See [idempotency.md](../api/idempotency.md). |
| `Idempotent-Replayed: true` | response | The response repeats an earlier request with the same key. |
| `Retry-After`, `RateLimit-*` | response | On 429. |

`X-Client-Platform` and `X-Client-Version` are **diagnostic only**. They are validated against a closed set and a strict
pattern, written to the request log together with the request id, and never used for authorization, rate limits or feature
decisions: a client can send anything. The request log line is written at `info` level and the logger defaults to `warn` in
production, so set `LOG_LEVEL=info` (staging, or temporarily in production) to see them.

## Retrying

The server never retries on the client's behalf. What is safe to repeat:

| Request | Safe to retry? |
|---|---|
| `GET`, `HEAD` | Yes, on network errors, timeouts, 502/503/504 and 429 (honor `Retry-After`). |
| `POST /api/uploads` | Yes. It only hands out a new signed upload slot. |
| `POST /api/chat/messages`, `/api/posts`, `/api/posts/{id}/comments` | Only with the same `Idempotency-Key`. Then also after a 500. |
| Any other `POST`, `PUT`, `PATCH`, `DELETE` | No. |
| Anything answered 400, 401, 403, 404, 409 | No. |

An expired access token is answered **403 with `code: AUTH_TOKEN_INVALID`**: refresh the session once, then repeat.

## Timeouts

The server has no fixed client contract; the mobile defaults are 15 s for JSON, 120 s for file transfers. Serverless hosts
cap function duration (`vercel.json` allows 30 s for API routes), so a client timeout above 30 s on a JSON call only waits
for a response that cannot come.

## Where each topic lives

[auth.md](auth.md) sign-in and failure handling, [uploads.md](uploads.md) files going up, [media.md](media.md) media URLs
and files coming down, [../api/idempotency.md](../api/idempotency.md) retry-safe creates, [../api/conventions.md](../api/conventions.md)
envelopes, errors and pagination.
