# Uploads from a native client

Files go straight from the phone to Supabase Storage through a one-use signed upload slot; the API then verifies the stored
bytes before any record may use them. The flow below was checked against the Docker stack with the real Storage server (the
"Observed" notes). Small files can also be sent as multipart to the route that uses them.

## Direct upload (preferred, and what the web client does)

1. `POST /api/uploads` (`uploads_createUploadIntent`) with `{ purpose, mimeType, size, conversationId? }`.
   The API checks purpose, type, size and (for `chat`) conversation membership and answers `201` with
   `{ purpose, bucket, path, token, signedUrl, mimeType, maxBytes, expiresAt }`.
   * `signedUrl` is the **client-facing** Storage address (built from `SUPABASE_PUBLIC_URL` when the server reaches Supabase on
     an internal address, as in the Docker stack). It contains the secret token in its query: never log it.
   * `expiresAt` is the moment the slot closes, read from the token's own `exp`. It is `null` only if the token could not be
     read. **The lifetime depends on the Storage deployment**: observed about 1 minute on the Docker stack; hosted Supabase
     allows more. Upload right after requesting, and ask for a new slot if it is about to close or has closed.
2. `PUT <signedUrl>` with the file's **raw bytes** and a `Content-Type` header equal to the declared `mimeType`.
   * Observed: a raw body is accepted (`200`, body `{"Key":"<bucket>/<path>"}`). A multipart body is accepted too (that is what
     supabase-js sends), so React Native does not need to build a `Blob` or `FormData` for this step.
   * Do **not** send `Authorization`. The token is in the URL and the app's bearer token must not go to the Storage host.
   * Observed: Storage does not inspect the content here. Uploading bytes that are not an image succeeds at this step.
3. Call the route that uses the file with `uploadPath: <path>` (`POST /api/posts`, `POST /api/chat/messages`,
   `POST /api/profile/upload-picture`, ...). The API (`claimUpload`) re-checks that the path belongs to the caller and the
   purpose, the size, the **magic bytes** and the declared type, and **deletes the object** if any check fails
   (observed: `400 Uploaded file content does not match an allowed file type`, and a second claim of the same path then
   reports the upload as not found).

### Retrying a transfer

* A `PUT` that got no answer may or may not have stored the file. Repeating it is safe: Storage answers the repeat with
  **HTTP 400 and body `{"statusCode":"409","error":"Duplicate","code":"KeyAlreadyExists"}`** (observed; `x-upsert: true` does not
  change it for a signed slot). On a *retry*, that answer means the first transfer arrived in full; continue to step 3, where
  the API verifies the bytes. The same answer on a first attempt is an error.
* A closed slot answers **HTTP 400** with `InvalidJWT` (`"exp" claim timestamp check failed`). Request a new slot, once.
* Retry network errors, timeouts, 429 and 5xx a bounded number of times with backoff. Do not retry 401, 403, 413 or other 4xx.

### Cleanup of abandoned uploads

An upload that is never claimed stays in Storage as an orphan (a slot does not delete it, and nothing in the API sweeps orphans
today). Objects that fail the claim are deleted. A scheduled sweep of unclaimed objects older than a day is a recommended
follow-up; it needs a service-role job, not the mobile app.

## Limits

| purpose | max size | types |
|---|---|---|
| `avatar` | 2 MB | images |
| `cover`, `post`, `lostFound`, `catPost`, `event` | 5 MB | images |
| `resource` | 10 MB | PDF |
| `chat` | 10 MB (video 50 MB) | images, PDF, video, audio |

(`src/server/services/uploadIntentService.ts` is authoritative; `maxBytes` in the slot response is the limit for this file.)
Vercel caps a request body at about 4.5 MB, which is why large files must use the direct flow.

## Multipart through the API (small files only)

`imageUpload`, `profilePictureUpload`, `coverPictureUpload`, `pdfUpload` and `attachmentUpload` accept a multipart body with the
file in `image`, `profilePicture`, `coverPicture`, `pdf` or `attachment` (per operation in the contract). In React Native build
the part as `{ uri, name, type }` and do not set the `Content-Type` header yourself (the boundary must be generated). A multipart
body counts toward the same 4.5 MB limit on Vercel.

## Downloads

See [media.md](media.md).
