const {
  ensureSupabaseAdmin,
  mapProfile,
  profileSelect,
} = require("../utils/supabaseData");
const { sanitizePlainText } = require("../utils/validation");

const directKey = (userId1, userId2) => [userId1, userId2].sort().join(":");

const mapMessage = (message) => ({
  id: message.id,
  conversationId: message.conversation_id,
  senderId: message.sender_id,
  receiverId: null,
  content: message.content,
  sentAt: message.sent_at,
  isRead: Boolean(message.read_at),
  readAt: message.read_at,
  attachmentUrl: message.attachment_path ? `/api/chat/attachments/${message.id}` : null,
  attachmentName: message.attachment_name,
  sender: mapProfile(message.sender),
});

const mapConversation = (conversation, currentUserId = null) => {
  const participants = (conversation.participants || []).map((participant) => ({
    id: participant.id,
    conversationId: participant.conversation_id,
    userId: participant.user_id,
    joinedAt: participant.joined_at,
    user: mapProfile(participant.user),
  }));
  const otherParticipant = currentUserId
    ? participants.find((participant) => participant.userId !== currentUserId)
    : null;
  const lastMessage = conversation.messages?.[0]
    ? mapMessage(conversation.messages[0])
    : null;

  return {
    id: conversation.id,
    conversationType: conversation.conversation_type,
    directKey: conversation.direct_key,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    participants,
    otherUser: otherParticipant?.user || null,
    lastMessage,
    unreadCount: conversation.unreadCount || 0,
  };
};

class ChatService {
  async getOrCreateConversation(userId1, userId2) {
    const supabase = ensureSupabaseAdmin();
    const key = directKey(userId1, userId2);

    const existing = await this.getConversationByDirectKey(key);
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
        return this.getConversationByDirectKey(key);
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
    return this.getConversationByDirectKey(key);
  }

  async sendMessage(conversationId, senderId, _receiverId, content, attachment = null) {
    const supabase = ensureSupabaseAdmin();
    const canAccess = await this.isParticipant(conversationId, senderId);
    if (!canAccess) throw new Error("Conversation not found or access denied");

    const { data: message, error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: Number(conversationId),
        sender_id: senderId,
        content: sanitizePlainText(content, { max: 4000 }),
        attachment_path: attachment?.path || null,
        attachment_bucket: attachment?.bucket || null,
        attachment_name: attachment?.name ? sanitizePlainText(attachment.name, { max: 240 }) : null,
        attachment_mime_type: attachment?.mimeType || null,
        attachment_size_bytes: attachment?.size || null,
      })
      .select(`*, sender:profiles!chat_messages_sender_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", Number(conversationId));

    return mapMessage(message);
  }

  async getMessages(conversationId, userId, page = 1, limit = 50) {
    const supabase = ensureSupabaseAdmin();
    const canAccess = await this.isParticipant(conversationId, userId);
    if (!canAccess) throw new Error("Conversation not found or access denied");

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const { data, error } = await supabase
      .from("chat_messages")
      .select(`*, sender:profiles!chat_messages_sender_id_fkey(${profileSelect})`)
      .eq("conversation_id", Number(conversationId))
      .order("sent_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return data.reverse().map(mapMessage);
  }

  async getUserConversations(userId, { page = 1, limit = 20 } = {}) {
    const supabase = ensureSupabaseAdmin();
    const { data: memberships, count, error } = await supabase
      .from("conversation_participants")
      .select("conversation_id", { count: "exact" })
      .eq("user_id", userId)
      .limit(500);

    if (error) throw error;
    const ids = memberships.map((membership) => membership.conversation_id);
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
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
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

  async markMessagesAsRead(conversationId, userId) {
    const supabase = ensureSupabaseAdmin();
    const canAccess = await this.isParticipant(conversationId, userId);
    if (!canAccess) throw new Error("Conversation not found or access denied");

    const { error } = await supabase
      .from("chat_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", Number(conversationId))
      .neq("sender_id", userId)
      .is("read_at", null);

    if (error) throw error;
    return { success: true };
  }

  async getAttachment(messageId, userId) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase.from("chat_messages").select("id,conversation_id,attachment_bucket,attachment_path,attachment_name").eq("id", Number(messageId)).maybeSingle();
    if (error) throw error;
    if (!data?.attachment_path) throw new Error("Attachment not found");
    if (!(await this.isParticipant(data.conversation_id, userId))) throw new Error("Conversation not found or access denied");
    return data;
  }

  async isParticipant(conversationId, userId) {
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

  async getConversationByDirectKey(key) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("direct_key", key)
      .maybeSingle();

    if (error) throw error;
    return data ? this.getConversationById(data.id) : null;
  }

  async getConversationById(id, currentUserId = null) {
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

    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select(`*, sender:profiles!chat_messages_sender_id_fkey(${profileSelect})`)
      .eq("conversation_id", conversation.id)
      .order("sent_at", { ascending: false })
      .limit(1);

    if (messagesError) throw messagesError;
    let unreadCount = 0;
    if (currentUserId) {
      const { count, error: unreadError } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversation.id)
        .neq("sender_id", currentUserId)
        .is("read_at", null);
      if (unreadError) throw unreadError;
      unreadCount = count || 0;
    }
    return mapConversation({ ...conversation, participants, messages, unreadCount }, currentUserId);
  }
}

module.exports = new ChatService();
