# Idempotency (retry-safe creates)

A phone on a weak connection cannot tell whether a request that timed out reached the server. Without protection the retry
creates a second message, post or comment. This document specifies the optional `Idempotency-Key` header that prevents that.
It is additive: clients that never send the header behave exactly as before.

## Scope

Honored on exactly three operations. Do not send it to others expecting protection; it is ignored there.

| Operation | `operationId` | Stored with the row |
|---|---|---|
| `POST /api/chat/messages` | `chat_sendMessage` | `chat_messages.client_request_id` |
| `POST /api/posts` | `posts_createPost` | `posts.client_request_id` |
| `POST /api/posts/{id}/comments` | `posts_createComment` | `post_comments.client_request_id` |

Why these: a duplicate is immediately visible to other people (a message sent twice, a post appearing twice) and they are
the creates a mobile client will retry. Other creates (jobs, events, reports, reactions, ...) are not protected; the mobile
transport never retries them. Upload-slot creation (`POST /api/uploads`) needs no key because repeating it creates nothing.

## Contract

**Request header** `Idempotency-Key: <key>`, 16 to 64 characters of `A-Z a-z 0-9 _ -` (a UUID works).

* Absent: unchanged behavior, no protection.
* Malformed: `400`, `code: IDEMPOTENCY_KEY_INVALID`. Nothing is created.
* The client must create the key **once per user action** and send the **same key on every retry** of that action. A fresh key
  per attempt defeats the protection.

**Server behavior**

1. Authentication and the normal authorization checks run first (participant of the conversation, not blocked, post visible,
   ...). A key can never be used to read or repeat anything the caller may not do.
2. The key is looked up **scoped to the signed-in member** (`(author, key)`), so two members may use the same value
   independently and nobody can probe another member's keys.
3. Found, and the request has the same content: respond with the **existing** resource, status `201` as for the first call,
   plus the response header `Idempotent-Replayed: true`. Nothing is created and no file is stored again.
4. Found, but the content differs: `409`, `code: IDEMPOTENCY_KEY_REUSED`. Nothing changes.
5. Not found: create the row **with the key**. A unique index on `(author, client_request_id)` guarantees that two requests
   racing with the same key cannot both insert: the loser's insert fails with a unique violation, the loser loads the
   winner's row and answers as in step 3 (and deletes an attachment it had stored for itself).

**What "the same content" means** (the request fingerprint)

| Operation | Compared |
|---|---|
| chat message | conversation, text, shared post, GIF URL, and the attachment (the `uploadPath`, or the file size for a multipart file) |
| post | text, anonymous flag, category, and the image (the `uploadPath`, or the file size) |
| comment | post, text, parent comment, anonymous flag |

## Durability and expiry

The key lives in the same row as the created resource, in PostgreSQL, so it survives deploys, restarts and serverless
scale-out. There is no in-memory state. It does not expire: it is kept for the life of the row, and it disappears if the
row is deleted. Consequence: re-using a very old key returns the old resource, which is why keys must be generated per action
and never reused for a new action.

## Partial failure

* If the first request created the row but the response was lost, the retry returns the row (step 3).
* A message send inserts the message and then updates the conversation's `updated_at` in a second statement. If the process
  died between them, the retry returns the message; the conversation timestamp may be stale until the next message. This is
  cosmetic and was already true before.
* A multipart or direct-upload attachment is stored lazily, only when the message is new, so a replay does not store the
  file twice. If the request that stored a file loses the race, it deletes its own copy. A file uploaded by the client
  through a signed upload is never deleted by this path.
* If the request fails before the row is created (validation, authorization, 5xx), nothing is stored under the key and the
  retry runs normally.

## Retries and the mobile transport

The mobile transport retries a POST only when it carries `Idempotency-Key` **and** targets one of the three operations
above; other methods and operations are attempted once. See the mobile repo's `docs/api-transport.md`.

## Database

`supabase/migrations/202610290001_client_request_ids.sql` adds the nullable `client_request_id text` column (format check
`^[A-Za-z0-9_-]{16,64}$`) and the unique indexes. They are plain, non-partial unique indexes because PostgREST can only target
those; NULLs are distinct in a unique index, so any number of rows without a key may exist. The migration is additive; apply
it to every environment **before** deploying code that sends the key (deploy order: migrate, deploy backend, ship the app).
Realtime payloads for `chat_messages` include the column; a key is a random client label, not a secret.

## Tests

`tests/server/idempotency-behavior.test.ts` (logic with a unique-constraint-enforcing in-memory table: same key and payload,
different payload, different members, lost race, malformed keys, authorization, blocked sender, lazy attachments),
`supabase/tests/client-request-ids.test.sql` (the constraints themselves), and a run against the real Docker stack with
simultaneous requests (see the mobile repo's `docs/phase-d-progress.md`).
