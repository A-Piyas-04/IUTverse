# Messaging

Direct chats between IUT members, with what people expect from WhatsApp or
Messenger: receipts, edits, emoji, reactions, photos, videos, voice messages,
GIFs and shared posts.

## What members can do

| Feature | How it works |
|---|---|
| **Receipts** | One tick: the server has the message. Two grey ticks: it reached the other person's app (IUTverse open in any tab, on any page). Two coloured ticks: they opened the chat. Hover a tick for the time. Ticks update live. |
| **Edit** | The sender can change a message's text, or a photo/video/file caption, for **10 minutes** after sending. Edited messages say "edited". The server enforces the window. |
| **Emoji** | The 😊 button inserts emoji into the message (search by name, recent ones first). |
| **Reactions** | Hover a message (or tap the 😊+ beside it on a phone) to react. One reaction per person per message; the same emoji again removes it. Hover a reaction to see who added it. |
| **Photos and videos** | Paperclip, paste or drag in. Photos (JPEG, PNG, WebP, GIF) and PDFs up to 10 MB, videos (MP4, WebM, MOV) up to 50 MB, with an optional caption. Photos open full size. |
| **Voice messages** | The microphone button records (up to 5 minutes); the trash button discards, the send button sends. The player shows a waveform you can click to seek. |
| **GIFs** | The GIF button searches KLIPY (Tenor's API closed on 30 June 2026). Needs `KLIPY_API_KEY`. |
| **Chat info** | Click the person's name or photo at the top of a chat. Quick actions: Profile, Mute, Search. Then: edit nicknames (seen by both people), media / files / links shared in the chat, mute (1 h, 8 h, 24 h, or until turned back on), mark as unread, block, delete chat. |
| **Mute** | Muted chats show 🔕 and are left out of the unread badge on Messages and the "(3) IUTverse" tab title. |
| **Block** | Neither person can message the other until it's lifted (enforced by the API and by the database's own insert rule). The blocked person isn't told; they see "You can't reply to this conversation". |
| **Delete chat** | Removes the conversation for you only. It comes back, with just the new messages, if someone writes again. |
| **Shared posts** | A post's **Share** button sends it to up to 15 chats with an optional note. It arrives as a card linking to the post, which says "no longer available" if the post is deleted or moderated. |

## Site search

The navbar search box searches people, posts, events, jobs, academic
resources and lost & found as you type, grouped like Facebook's, with recent
searches and arrow-key navigation. **See all results** opens `/search`, which
has a tab per kind. Phones get a search button in the top bar. Each kind
follows its own list's visibility rules: only active content, and anonymous
posts never reveal their author. API: `GET /api/search?q=&type=&page=`.
Trigram indexes keep these "contains" searches fast.

## How it is built

- **Database:** `supabase/migrations/202610240001_chat_messaging.sql` adds
  `kind`, `delivered_at`, `edited_at`, media layout hints, GIF and
  shared-post columns to `chat_messages`, and the `chat_message_reactions`
  table. Clients keep read-only access under RLS. The API writes receipts,
  edits, reactions and media rows with the service role, so nobody can fake a
  "read" or edit someone else's message. A trigger touches the message when a
  reaction changes, so one Realtime subscription per chat covers new messages,
  ticks, edits and reactions.
- **Realtime:** `ChatPane` subscribes to its conversation's `chat_messages`;
  `useInboxReceipts` (in the app shell) subscribes to new messages anywhere and
  calls `POST /api/chat/delivered`. Both fall back to polling if Realtime is
  unavailable.
- **Media:** files go from the browser straight to the private
  `chat-attachments` bucket through a signed upload URL (`POST /api/uploads`,
  purpose `chat`). The API checks the stored bytes against the declared type
  before a message may use them. Message payloads carry one-hour signed links.
  Voice messages are recorded with `MediaRecorder` (WebM/Opus, or MP4/AAC on
  Safari).
- **GIFs:** `GET /api/chat/gifs` proxies KLIPY so the key never reaches
  browsers. GIF messages may only point at `https://static.klipy.com`, which
  is also the only extra image origin in the page CSP.
- **Microphone:** `Permissions-Policy` allows `microphone=(self)` so the site
  can record. Nothing embedded in it can, and the camera stays off.

Chat settings live on `conversation_participants` (`nickname`, `muted_until`,
`marked_unread`, `cleared_at`); blocks in `user_blocks`
(`202610240002_chat_settings_blocks_search.sql`).

API: `PATCH /api/chat/conversations/:id/settings`, `POST /api/chat/conversations/:id/clear`,
`GET /api/chat/conversations/:id/search?q=`, `GET /api/chat/conversations/:id/media?type=media|files|links`,
`POST|DELETE /api/chat/blocks/:userId`, `POST /api/chat/messages` (text, attachment, GIF or shared post),
`PATCH /api/chat/messages/:id` (edit), `POST /api/chat/messages/:id/reactions`,
`POST /api/chat/delivered`, `PUT /api/chat/conversations/:id/read`,
`GET /api/chat/gifs?q=`, `POST /api/chat/share`.

## Setting it up on the hosted project

1. **Apply the migration** from a trusted machine:

   ```bash
   npm run migrate:supabase
   ```

   It applies `202610240001_chat_messaging.sql` and
   `202610240002_chat_settings_blocks_search.sql`. Until they are applied,
   chat and search fail, because the API uses the new columns and tables.
2. **Supabase Storage limit:** under Project Settings → Storage, the global
   upload limit must be at least 50 MB for videos. That is the Free plan's
   maximum and its default.
3. **Realtime:** `chat_messages` is already in the `supabase_realtime`
   publication (from the first migration). Nothing to do.
4. **GIFs (optional):** create an API key in the
   [KLIPY partner panel](https://docs.klipy.com) (free), and set
   `KLIPY_API_KEY` on Vercel (Production and Preview), then redeploy. Without
   it, the GIF picker says GIFs are not set up and everything else works. KLIPY
   requires the search box placeholder "Search KLIPY", which the picker uses.

## Tests

- Unit: `src/features/messages/*.test.ts(x)`, `tests/server/chat-*.test.ts`,
  `tests/server/gif-service.test.ts`, chat cases in `tests/server/uploads-behavior.test.ts`.
- Database: `supabase/tests/chat-messaging.test.sql`, `supabase/tests/chat-blocks.test.sql`.
- End to end, two members in two browsers on the Docker stack from
  `e2e/oauth`:

  ```bash
  docker compose -p iutverse-oauth --env-file e2e/oauth/oauth.env -f docker-compose.yml -f e2e/oauth/docker-compose.oauth.yml up -d --build
  E2E_BROWSER_CHANNEL=msedge npm run test:e2e:chat
  ```

Not built yet: typing indicators, online status, deleting a message for
everyone, replies to a specific message, push/sound notifications, and group
chats beyond the seeded one.
