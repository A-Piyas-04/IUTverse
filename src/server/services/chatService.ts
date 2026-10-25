import "server-only";
import { PublicError } from "../http/errors";
import { ensureSupabaseAdmin, mapProfile, profileSelect, publicUrl } from "../utils/supabaseData";
import { sanitizePlainText } from "../utils/validation";
import { browserUrl } from "./storageService";

const directKey = (userId1: string, userId2: string) => [userId1, userId2].sort().join(":");
// Wildcards typed into a search are matched literally (as spaces) rather than as patterns.
const escapeLike = (value: string) => value.replace(/[%_*\\]/g, " ");

const CHAT_BUCKET = "chat-attachments";
/** How long the sender may still change a message's text. */
export const EDIT_WINDOW_MS = 10 * 60 * 1000;
// Media links in a message payload stay valid this long; the client reuses
// them instead of reloading every photo on each refresh.
const MEDIA_URL_SECONDS = 60 * 60;

export type MessageKind = "text" | "image" | "video" | "audio" | "file" | "gif" | "post";
const EDITABLE_KINDS: ReadonlySet<string> = new Set(["text", "image", "video", "file"]);

export interface Attachment {
  path: string;
  bucket: string;
  name?: string;
  mimeType?: string;
  size?: number;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  waveform?: number[] | null;
}

export interface Gif {
  url: string;
  width: number;
  height: number;
}

export interface OutgoingMessage {
  content: string;
  attachment?: Attachment | null;
  gif?: Gif | null;
  sharedPostId?: number | null;
}

interface Hydration {
  urls?: Map<string, string>;
  reactions?: Map<number, { emoji: string; userId: string }[]>;
  posts?: Map<number, unknown>;
}

const kindForAttachment = (mimeType?: string | null): MessageKind => {
  const type = String(mimeType || "");
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "file";
};

const mapMessage = (message: any, { urls, reactions, posts }: Hydration = {}) => {
  const url = message.attachment_path ? urls?.get(message.attachment_path) ?? null : null;
  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    receiverId: null,
    kind: (message.kind || "text") as MessageKind,
    content: message.content,
    sentAt: message.sent_at,
    deliveredAt: message.delivered_at ?? null,
    readAt: message.read_at,
    editedAt: message.edited_at ?? null,
    isRead: Boolean(message.read_at),
    attachment: message.attachment_path
      ? {
          url,
          name: message.attachment_name,
          mimeType: message.attachment_mime_type,
          size: message.attachment_size_bytes,
          width: message.attachment_width ?? null,
          height: message.attachment_height ?? null,
          durationMs: message.attachment_duration_ms ?? null,
          waveform: message.attachment_waveform ?? null,
        }
      : null,
    attachmentUrl: url,
    attachmentName: message.attachment_name,
    gif: message.gif_url ? { url: message.gif_url, width: message.gif_width, height: message.gif_height } : null,
    sharedPost: message.kind === "post"
      ? posts?.get(message.shared_post_id) ?? { id: message.shared_post_id ?? null, available: false }
      : null,
    reactions: reactions?.get(message.id) ?? [],
    sender: mapProfile(message.sender),
  };
};

export type ChatMessage = ReturnType<typeof mapMessage>;

// "Until I turn it back on" is stored as a far-future time JavaScript can parse.
export const MUTED_FOREVER = "9999-12-31T00:00:00.000Z";
const MUTE_MINUTES: Record<string, number | null> = { "1h": 60, "8h": 480, "24h": 1440, forever: null };

const mapConversation = (conversation: any, currentUserId: string | null = null) => {
  const participants = (conversation.participants || []).map((participant: any) => ({
    id: participant.id,
    conversationId: participant.conversation_id,
    userId: participant.user_id,
    joinedAt: participant.joined_at,
    nickname: participant.nickname || null,
    user: mapProfile(participant.user),
  }));
  const otherParticipant = currentUserId
    ? participants.find((participant: any) => participant.userId !== currentUserId)
    : null;
  const mine = (conversation.participants || []).find((participant: any) => participant.user_id === currentUserId);
  const lastMessage = conversation.messages?.[0]
    ? mapMessage(conversation.messages[0])
    : null;
  const mutedUntil = mine?.muted_until && new Date(mine.muted_until).getTime() > Date.now() ? mine.muted_until : null;

  return {
    id: conversation.id,
    conversationType: conversation.conversation_type,
    title: conversation.title || null,
    directKey: conversation.direct_key,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    participants,
    otherUser: otherParticipant?.user || null,
    /** What this member calls the other person in this chat, if anyone set a nickname. */
    otherNickname: otherParticipant?.nickname || null,
    lastMessage,
    // "Mark as unread" shows at least one unread message.
    unreadCount: Math.max(conversation.unreadCount || 0, mine?.marked_unread ? 1 : 0),
    settings: {
      mutedUntil,
      muted: Boolean(mutedUntil),
      markedUnread: Boolean(mine?.marked_unread),
      clearedAt: mine?.cleared_at || null,
    },
    blocked: conversation.blocked || { byMe: false, byThem: false },
  };
};

const messageSelect = `*, sender:profiles!chat_messages_sender_id_fkey(${profileSelect})`;

class ChatService {
  // userId1 is the member asking; the result's otherUser is userId2.
  async getOrCreateConversation(userId1: string, userId2: string) {
    const supabase = ensureSupabaseAdmin();
    const key = directKey(userId1, userId2);

    const existing = await this.getConversationByDirectKey(key, userId1);
    if (existing) return existing;

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        conversation_type: "direct",
        direct_key: key,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return this.getConversationByDirectKey(key, userId1);
      }
      throw error;
    }

    const { error: participantsError } = await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: conversation.id, user_id: userId1 },
        { conversation_id: conversation.id, user_id: userId2 },
      ]);

    if (participantsError) throw participantsError;
    return this.getConversationByDirectKey(key, userId1);
  }

  /** Adds signed media links, reactions and shared-post previews to message rows. */
  async hydrate(rows: any[]) {
    const supabase = ensureSupabaseAdmin();
    const ids = rows.map((row) => row.id);
    const paths = [...new Set(rows.filter((row) => row.attachment_path && row.attachment_bucket === CHAT_BUCKET).map((row) => row.attachment_path as string))];
    const postIds = [...new Set(rows.filter((row) => row.kind === "post" && row.shared_post_id).map((row) => Number(row.shared_post_id)))];

    const [signed, reactionRows, postRows] = await Promise.all([
      paths.length ? supabase.storage.from(CHAT_BUCKET).createSignedUrls(paths, MEDIA_URL_SECONDS) : null,
      ids.length ? supabase.from("chat_message_reactions").select("message_id, user_id, emoji, created_at").in("message_id", ids).order("created_at") : null,
      postIds.length
        ? supabase
            .from("posts")
            .select(`id, content, is_anonymous, status, image_bucket, image_path, created_at, user:profiles!posts_author_id_fkey(${profileSelect})`)
            .in("id", postIds)
        : null,
    ]);
    if (signed?.error) throw signed.error;
    if (reactionRows?.error) throw reactionRows.error;
    if (postRows?.error) throw postRows.error;

    const urls = new Map<string, string>();
    for (const item of signed?.data || []) {
      if (item.path && item.signedUrl) urls.set(item.path, browserUrl(item.signedUrl) as string);
    }
    const reactions = new Map<number, { emoji: string; userId: string }[]>();
    for (const row of (reactionRows?.data as any[]) || []) {
      const list = reactions.get(row.message_id) || [];
      list.push({ emoji: row.emoji, userId: row.user_id });
      reactions.set(row.message_id, list);
    }
    const posts = new Map<number, unknown>();
    for (const post of (postRows?.data as any[]) || []) {
      const available = post.status === "active";
      posts.set(post.id, available
        ? {
            id: post.id,
            available: true,
            content: sanitizePlainText(post.content || "", { max: 280 }),
            imageUrl: publicUrl(post.image_bucket, post.image_path),
            isAnonymous: Boolean(post.is_anonymous),
            author: post.is_anonymous ? null : mapProfile(post.user),
            createdAt: post.created_at,
          }
        : { id: post.id, available: false });
    }
    return rows.map((row) => mapMessage(row, { urls, reactions, posts }));
  }

  private async loadMessage(messageId: number) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase.from("chat_messages").select(messageSelect).eq("id", Number(messageId)).maybeSingle();
    if (error) throw error;
    return data as any;
  }

  async sendMessage(conversationId: number, senderId: string, outgoing: OutgoingMessage) {
    const supabase = ensureSupabaseAdmin();
    const canAccess = await this.isParticipant(conversationId, senderId);
    if (!canAccess) throw new Error("Conversation not found or access denied");
    const blocked = await this.blockState(senderId, await this.otherParticipantIds(conversationId, senderId));
    if (blocked.byMe) throw new PublicError("You blocked this person. Unblock them to send messages.", 403);
    if (blocked.byThem) throw new PublicError("You can't message this person.", 403);

    const { attachment, gif, sharedPostId } = outgoing;
    const kind: MessageKind = sharedPostId ? "post" : gif ? "gif" : attachment ? kindForAttachment(attachment.mimeType) : "text";
    const { data: message, error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: Number(conversationId),
        sender_id: senderId,
        kind,
        content: sanitizePlainText(outgoing.content, { max: 4000 }),
        attachment_path: attachment?.path || null,
        attachment_bucket: attachment?.bucket || null,
        attachment_name: attachment?.name ? sanitizePlainText(attachment.name, { max: 240 }) : null,
        attachment_mime_type: attachment?.mimeType || null,
        attachment_size_bytes: attachment?.size || null,
        attachment_width: attachment?.width ?? null,
        attachment_height: attachment?.height ?? null,
        attachment_duration_ms: attachment?.durationMs ?? null,
        attachment_waveform: attachment?.waveform ?? null,
        gif_url: gif?.url ?? null,
        gif_width: gif?.width ?? null,
        gif_height: gif?.height ?? null,
        shared_post_id: sharedPostId ?? null,
      })
      .select(messageSelect)
      .single();

    if (error) throw error;

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", Number(conversationId));

    return (await this.hydrate([message]))[0];
  }

  /** Changes a message's text. Only its sender, only within EDIT_WINDOW_MS. */
  async editMessage(messageId: number, userId: string, content: string, now = Date.now()) {
    const supabase = ensureSupabaseAdmin();
    const message = await this.loadMessage(messageId);
    if (!message || message.sender_id !== userId) throw new PublicError("Message not found", 404);
    if (!EDITABLE_KINDS.has(message.kind || "text")) throw new PublicError("This message cannot be edited");
    if (now - new Date(message.sent_at).getTime() > EDIT_WINDOW_MS) {
      throw new PublicError("Messages can only be edited for 10 minutes after sending", 403);
    }
    const text = sanitizePlainText(content, { max: 4000 });
    if (!text && (message.kind || "text") === "text") throw new PublicError("Message cannot be empty");
    if (text === message.content) return (await this.hydrate([message]))[0];

    const { data, error } = await supabase
      .from("chat_messages")
      .update({ content: text, edited_at: new Date(now).toISOString() })
      .eq("id", message.id)
      .select(messageSelect)
      .single();
    if (error) throw error;
    return (await this.hydrate([data]))[0];
  }

  /** Sets the member's reaction; the same emoji again removes it. */
  async toggleReaction(messageId: number, userId: string, emoji: string) {
    const supabase = ensureSupabaseAdmin();
    const message = await this.loadMessage(messageId);
    if (!message || !(await this.isParticipant(message.conversation_id, userId))) throw new PublicError("Message not found", 404);

    const { data: existing, error } = await supabase
      .from("chat_message_reactions")
      .select("id, emoji")
      .eq("message_id", message.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;

    const write = existing?.emoji === emoji
      ? supabase.from("chat_message_reactions").delete().eq("id", existing.id)
      : supabase
          .from("chat_message_reactions")
          .upsert({ message_id: message.id, conversation_id: message.conversation_id, user_id: userId, emoji }, { onConflict: "message_id,user_id" });
    const { error: writeError } = await write;
    if (writeError) throw writeError;
    return (await this.hydrate([message]))[0];
  }

  async getMessages(conversationId: number, userId: string, page: unknown = 1, limit: unknown = 50) {
    const supabase = ensureSupabaseAdmin();
    const canAccess = await this.isParticipant(conversationId, userId);
    if (!canAccess) throw new Error("Conversation not found or access denied");

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const clearedAt = await this.clearedAt(conversationId, userId);
    let query = supabase
      .from("chat_messages")
      .select(messageSelect)
      .eq("conversation_id", Number(conversationId))
      .order("sent_at", { ascending: false })
      .range(from, to);
    if (clearedAt) query = query.gt("sent_at", clearedAt);
    const { data, error } = await query;

    if (error) throw error;
    return this.hydrate((data as any[]).reverse());
  }

  private async clearedAt(conversationId: number, userId: string): Promise<string | null> {
    const { data, error } = await ensureSupabaseAdmin()
      .from("conversation_participants")
      .select("cleared_at")
      .eq("conversation_id", Number(conversationId))
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data as any)?.cleared_at || null;
  }

  /** Blocks between the member and these people, in each direction. */
  async blockState(userId: string, otherIds: string[]) {
    if (!otherIds.length) return { byMe: false, byThem: false };
    const { data, error } = await ensureSupabaseAdmin()
      .from("user_blocks")
      .select("blocker_id, blocked_id")
      .or(`and(blocker_id.eq.${userId},blocked_id.in.(${otherIds.join(",")})),and(blocked_id.eq.${userId},blocker_id.in.(${otherIds.join(",")}))`);
    if (error) throw error;
    const rows = (data as any[]) || [];
    return { byMe: rows.some((row) => row.blocker_id === userId), byThem: rows.some((row) => row.blocked_id === userId) };
  }

  private async otherParticipantIds(conversationId: number, userId: string) {
    const { data, error } = await ensureSupabaseAdmin().from("conversation_participants").select("user_id").eq("conversation_id", Number(conversationId));
    if (error) throw error;
    return ((data as any[]) || []).map((row) => row.user_id as string).filter((id) => id !== userId);
  }

  /** The member's own settings for a chat, and nicknames (which everyone in it sees). */
  async updateSettings(conversationId: number, userId: string, change: { mute?: string; markedUnread?: boolean; nickname?: { userId: string; value: string | null } }) {
    const supabase = ensureSupabaseAdmin();
    if (!(await this.isParticipant(conversationId, userId))) throw new PublicError("Conversation not found", 404);
    const own: Record<string, unknown> = {};
    if (change.mute !== undefined) {
      if (change.mute === "off") own.muted_until = null;
      else if (Object.hasOwn(MUTE_MINUTES, change.mute)) {
        const minutes = MUTE_MINUTES[change.mute];
        own.muted_until = minutes === null ? MUTED_FOREVER : new Date(Date.now() + minutes * 60_000).toISOString();
      } else throw new PublicError("Mute must be one of: 1h, 8h, 24h, forever, off");
    }
    if (change.markedUnread !== undefined) own.marked_unread = change.markedUnread;
    if (Object.keys(own).length) {
      const { error } = await supabase.from("conversation_participants").update(own).eq("conversation_id", conversationId).eq("user_id", userId);
      if (error) throw error;
    }
    if (change.nickname) {
      if (!(await this.isParticipant(conversationId, change.nickname.userId))) throw new PublicError("That person is not in this chat");
      const { error } = await supabase
        .from("conversation_participants")
        .update({ nickname: change.nickname.value })
        .eq("conversation_id", conversationId)
        .eq("user_id", change.nickname.userId);
      if (error) throw error;
    }
    return this.getConversationById(conversationId, userId);
  }

  /** "Delete chat": hides everything so far for this member only. */
  async clearConversation(conversationId: number, userId: string) {
    if (!(await this.isParticipant(conversationId, userId))) throw new PublicError("Conversation not found", 404);
    const { error } = await ensureSupabaseAdmin()
      .from("conversation_participants")
      .update({ cleared_at: new Date().toISOString(), marked_unread: false })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);
    if (error) throw error;
    return { success: true };
  }

  async block(userId: string, targetId: string) {
    if (userId === targetId) throw new PublicError("You cannot block yourself");
    const { error } = await ensureSupabaseAdmin().from("user_blocks").upsert({ blocker_id: userId, blocked_id: targetId }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
    if (error) throw error;
    return { blocked: true };
  }

  async unblock(userId: string, targetId: string) {
    const { error } = await ensureSupabaseAdmin().from("user_blocks").delete().eq("blocker_id", userId).eq("blocked_id", targetId);
    if (error) throw error;
    return { blocked: false };
  }

  /** Messages in the chat whose text contains the query, newest first. */
  async searchMessages(conversationId: number, userId: string, query: string) {
    if (!(await this.isParticipant(conversationId, userId))) throw new PublicError("Conversation not found", 404);
    const clearedAt = await this.clearedAt(conversationId, userId);
    let request = ensureSupabaseAdmin()
      .from("chat_messages")
      .select(messageSelect)
      .eq("conversation_id", conversationId)
      .ilike("content", `%${escapeLike(query)}%`)
      .order("sent_at", { ascending: false })
      .limit(50);
    if (clearedAt) request = request.gt("sent_at", clearedAt);
    const { data, error } = await request;
    if (error) throw error;
    return ((data as any[]) || []).map((row) => mapMessage(row));
  }

  /** Photos and videos, files (PDFs), or messages with links, newest first. */
  async listMedia(conversationId: number, userId: string, type: "media" | "files" | "links", page = 1, limit = 30) {
    if (!(await this.isParticipant(conversationId, userId))) throw new PublicError("Conversation not found", 404);
    const clearedAt = await this.clearedAt(conversationId, userId);
    const from = (Math.max(page, 1) - 1) * limit;
    let request = ensureSupabaseAdmin()
      .from("chat_messages")
      .select(messageSelect)
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: false })
      .range(from, from + limit - 1);
    if (type === "media") request = request.in("kind", ["image", "video", "gif"]);
    else if (type === "files") request = request.eq("kind", "file");
    else request = request.or("content.ilike.*http://*,content.ilike.*https://*");
    if (clearedAt) request = request.gt("sent_at", clearedAt);
    const { data, error } = await request;
    if (error) throw error;
    return this.hydrate((data as any[]) || []);
  }

  async getUserConversations(userId: string, { page = 1, limit = 20 }: { page?: number; limit?: number } = {}) {
    const supabase = ensureSupabaseAdmin();
    const { data: memberships, count, error } = await supabase
      .from("conversation_participants")
      .select("conversation_id", { count: "exact" })
      .eq("user_id", userId)
      .limit(500);

    if (error) throw error;
    const ids = (memberships as any[]).map((membership) => membership.conversation_id);
    if (!ids.length) {
      return {
        conversations: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    }

    const allConversations = (await Promise.all(ids.map((id) => this.getConversationById(id, userId))))
      .filter((conversation): conversation is NonNullable<typeof conversation> => Boolean(conversation))
      // A chat the member deleted stays hidden until someone writes again.
      .filter((conversation) => !conversation.settings.clearedAt || conversation.lastMessage)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const from = (page - 1) * limit;
    const conversations = allConversations.slice(from, from + limit);
    return {
      conversations,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /** The member's app has received everything sent to them so far. */
  async markDelivered(userId: string) {
    const supabase = ensureSupabaseAdmin();
    const { data: memberships, error } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", userId).limit(500);
    if (error) throw error;
    const ids = (memberships as any[]).map((membership) => membership.conversation_id);
    if (!ids.length) return { updated: 0 };
    const { data, error: updateError } = await supabase
      .from("chat_messages")
      .update({ delivered_at: new Date().toISOString() })
      .in("conversation_id", ids)
      .neq("sender_id", userId)
      .is("delivered_at", null)
      .select("id");
    if (updateError) throw updateError;
    return { updated: (data as any[] | null)?.length ?? 0 };
  }

  /** The member opened the conversation: everything sent to them is delivered and read. */
  async markMessagesAsRead(conversationId: number, userId: string) {
    const supabase = ensureSupabaseAdmin();
    const canAccess = await this.isParticipant(conversationId, userId);
    if (!canAccess) throw new Error("Conversation not found or access denied");

    const now = new Date().toISOString();
    const delivered = await supabase
      .from("chat_messages")
      .update({ delivered_at: now })
      .eq("conversation_id", Number(conversationId))
      .neq("sender_id", userId)
      .is("delivered_at", null);
    if (delivered.error) throw delivered.error;

    const { error } = await supabase
      .from("chat_messages")
      .update({ read_at: now })
      .eq("conversation_id", Number(conversationId))
      .neq("sender_id", userId)
      .is("read_at", null);

    if (error) throw error;
    const unmarked = await supabase.from("conversation_participants").update({ marked_unread: false }).eq("conversation_id", Number(conversationId)).eq("user_id", userId).eq("marked_unread", true);
    if (unmarked.error) throw unmarked.error;
    return { success: true };
  }

  async getAttachment(messageId: unknown, userId: string) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase.from("chat_messages").select("id,conversation_id,attachment_bucket,attachment_path,attachment_name").eq("id", Number(messageId)).maybeSingle();
    if (error) throw error;
    // Only sign objects the API itself stored for chat.
    if (!data?.attachment_path || data.attachment_bucket !== CHAT_BUCKET) throw new Error("Attachment not found");
    if (!(await this.isParticipant(data.conversation_id, userId))) throw new Error("Conversation not found or access denied");
    return data;
  }

  async isParticipant(conversationId: number, userId: string) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", Number(conversationId))
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }

  async getConversationByDirectKey(key: string, currentUserId: string | null = null) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("direct_key", key)
      .maybeSingle();

    if (error) throw error;
    return data ? this.getConversationById(data.id, currentUserId) : null;
  }

  async getConversationById(id: number, currentUserId: string | null = null) {
    const supabase = ensureSupabaseAdmin();
    const { data: conversation, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", Number(id))
      .maybeSingle();

    if (error) throw error;
    if (!conversation) return null;

    const { data: participants, error: participantsError } = await supabase
      .from("conversation_participants")
      .select(`*, user:profiles!conversation_participants_user_id_fkey(${profileSelect})`)
      .eq("conversation_id", conversation.id);

    if (participantsError) throw participantsError;
    const clearedAt = (participants as any[]).find((participant) => participant.user_id === currentUserId)?.cleared_at || null;

    let lastQuery = supabase
      .from("chat_messages")
      .select(messageSelect)
      .eq("conversation_id", conversation.id)
      .order("sent_at", { ascending: false })
      .limit(1);
    if (clearedAt) lastQuery = lastQuery.gt("sent_at", clearedAt);
    const { data: messages, error: messagesError } = await lastQuery;

    if (messagesError) throw messagesError;
    let unreadCount = 0;
    let blocked = { byMe: false, byThem: false };
    if (currentUserId) {
      let unreadQuery = supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversation.id)
        .neq("sender_id", currentUserId)
        .is("read_at", null);
      if (clearedAt) unreadQuery = unreadQuery.gt("sent_at", clearedAt);
      const { count, error: unreadError } = await unreadQuery;
      if (unreadError) throw unreadError;
      unreadCount = count || 0;
      const others = (participants as any[]).filter((participant) => participant.user_id !== currentUserId).map((participant) => participant.user_id);
      blocked = await this.blockState(currentUserId, others);
    }
    return mapConversation({ ...conversation, participants, messages, unreadCount, blocked }, currentUserId);
  }
}

const chatService = new ChatService();
export default chatService;
