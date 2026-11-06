# Realtime contract

Realtime is not part of `openapi.yaml`. It is Supabase Realtime (`postgres_changes`) over the Supabase client, not an IUTverse
WebSocket API, and it is authorized by Postgres row level security, not by the IUTverse API. Do not treat it as an HTTP endpoint.

## What exists today

Only chat uses Realtime. The web client (`src/features/messages/ChatPane.tsx`, `useInboxReceipts.ts`) uses it as an **invalidation
signal**: on any event it refetches over REST. The REST responses stay the source of truth.

| Channel name (client-chosen) | Subscription | Purpose |
|---|---|---|
| `conversation:{conversationId}` | `postgres_changes`, event `*`, schema `public`, table `chat_messages`, filter `conversation_id=eq.{conversationId}` | A message in the open chat was inserted, edited, delivered, read or reacted to. |
| `inbox:{userId}` | `postgres_changes`, event `INSERT`, schema `public`, table `chat_messages` (no filter) | A new message arrived anywhere; used to acknowledge delivery (`POST /api/chat/delivered`) and refresh the conversation list. RLS limits events to chats the user participates in. |

Channel names are local labels; the server does not interpret them.

## Authorization

* The client connects with the Supabase anon key and the member's **access token**. Rows are visible only when the
  `chat_messages` select policy allows it: participants of the conversation (and admins/moderators), per
  `supabase/migrations/202605280002_rls_and_storage.sql`.
* The client must keep the Realtime socket's token current when the Supabase session refreshes.
* Clients cannot write messages, receipts, edits or reactions through Supabase; those go through the REST API (service role).

## Payloads

`postgres_changes` delivers the changed row (`new`, and `old` for updates/deletes) with database column names (snake_case, for
example `sender_id`, `conversation_id`), not the camelCase DTOs of the REST API. Rely on the id and use REST for the data.

## Mapping to REST

| Event | Refetch |
|---|---|
| Any change to `chat_messages` of a conversation | `GET /api/chat/conversations/{conversationId}/messages`, then `GET /api/chat/conversations` |
| Insert from another member | `POST /api/chat/delivered`, then `GET /api/chat/conversations` |

Reaction changes, edits, delivery and read ticks surface as updates to the message row (a trigger touches the message when a
reaction changes, per `docs/messaging.md`), so one subscription per chat covers them.

## Assumptions and gaps

* Ordering: events are not guaranteed to be ordered or exactly once; web debounces by 120 ms and refetches. Do the same.
* Reconnection: the web client relies on the Supabase client's automatic reconnect and also works without Realtime (it polls
  as a fallback). Mobile must refetch after reconnect, after returning to the foreground and after a token refresh.
* `posts` and `post_comments` were removed from the publication in `202607030001_critical_security_remediation.sql`; there is
  no feed Realtime.
* Presence, typing indicators and broadcast channels are not used.
* Event payload schemas are not formally specified; AsyncAPI is not justified for a single invalidation channel.
