# Media URLs and file downloads

How images and files appear in API responses and how a native client opens them. The rules apply to the representations that
exist **today**; the observations were made against the Docker stack.

## What responses contain

| Kind | Where it appears | Representation | Needs the bearer token? |
|---|---|---|---|
| Profile and cover pictures, post images, lost-and-found, cat posts, events | `profilePictureUrl`, `coverPictureUrl`, `imageUrl` | **Absolute public URL**: `<storage origin>/storage/v1/object/public/<bucket>/<owner id>/<prefix>-<time>-<random>.<ext>`, or `null`. The storage origin is `SUPABASE_PUBLIC_URL` when set, otherwise the Supabase project URL. | No |
| The same pictures by id | `GET /api/profile/picture/{userId}`, `/api/profile/cover/{userId}` | `302` to the public URL | Yes (the route is authenticated) |
| Academic resource files | `fileUrl`, `fileDownloadUrl` | **Relative API path** `/api/academic/resources/{id}/file`, answered with a `302` to a signed URL (5 minutes) or, with `?redirect=false`, JSON `{ url, expiresAt }` | Yes |
| Chat attachments | `attachment.url`, `attachmentUrl` in a message | **Absolute signed URL**, valid about 1 hour, regenerated on every message fetch | No (the token is in the URL) |
| Chat attachments by message id | `GET /api/chat/attachments/{messageId}` | `302` to a signed URL (5 minutes) or, with `?redirect=false`, JSON `{ url, expiresAt }` | Yes |
| Chat GIFs | `gif.url` | Absolute URL on the GIF provider's CDN (`https://static.klipy.com`) | No |
| Stored object paths | `image`, `profile.profilePicture`, `uploadPath` | A bucket-relative path. Not a URL: it cannot be resolved without the bucket. Never use it as an image source. | |

The web client's helper also accepted bare strings (`/files/<value>`). The API does not produce bare strings.

## Rules for a native client

1. Use an absolute `https` URL as is. Resolve a path starting with a single `/` against the API origin, and send the bearer
   token only for URLs on the **API origin under `/api/`**.
2. Refuse everything else: other schemes (`javascript:`, `data:`, `file:`, `blob:`, `content:`), protocol-relative `//host/...`,
   backslash tricks, URLs with embedded credentials, bare storage paths. The mobile repo's `resolveMedia` implements this.
3. **Never store a signed URL** as an identifier or in a database; keep the message or resource id and ask for a URL when
   needed. Never log one (the query holds the token).
4. To open a private file, call the id-based endpoint with `?redirect=false` and fetch the returned `url` **without** the
   bearer token. Each call signs a fresh URL (two calls return different URLs); `expiresAt` says when it stops working.
5. If Storage rejects a link (observed: **HTTP 400** with `InvalidJWT`, for an expired and for a tampered token), ask the API for a
   new URL **once**. That re-checks authorization: if the member lost access the API answers 403. If the fresh link also
   fails, stop; do not loop.

## Permission revocation and expiry

Authorization is checked when a signed URL is issued, not when it is used. A URL already handed out keeps working until it
expires (at most 5 minutes for the id-based endpoints, about 1 hour for URLs inside a message payload) even if the member's
access ends in the meantime. Public bucket URLs never expire and are readable by anyone who has the URL; only the
unguessable object name protects them.

## Known issues

* **Anonymous posts leak the author through the image URL (confirmed on the Docker stack, 2026-10-29).** Object names begin with
  the uploader's user id and the buckets are public. For a post with `isAnonymous: true` and an image, the response correctly
  nulls `userId`, `authorId` and `user`, but `imageUrl` and `image` still contain `.../post-media/<author user id>/post-....png`.
  Any member who can read the post can therefore learn who wrote it. This pre-dates the mobile work, affects the web app, and
  was **not** changed here because the fix alters upload-path ownership (`claimUpload` requires the path to start with the
  caller's id). Options: store anonymous images under a random folder and keep an owner record in the database; or serve
  anonymous images only through authenticated, signed URLs. Decide and fix before anonymous image posts are offered in the
  mobile app; until then the mobile app should not offer images on anonymous posts.
* Caching headers and `Content-Disposition` for stored files come from Supabase Storage's object metadata; this API does not
  set them. API JSON responses are `Cache-Control: no-store`.
