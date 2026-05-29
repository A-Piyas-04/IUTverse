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

  async sendMessage(conversationId, senderId, _receiverId, content) {
    const supabase = ensureSupabaseAdmin();
    const canAccess = await this.isParticipant(conversationId, senderId);
    if (!canAccess) throw new Error("Conversation not found or access denied");

    const { data: message, error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: Number(conversationId),
        sender_id: senderId,
        content: sanitizePlainText(content, { max: 4000 }),
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

  async getUserConversations(userId) {
    const supabase = ensureSupabaseAdmin();
    const { data: memberships, error } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (error) throw error;
    const ids = memberships.map((membership) => membership.conversation_id);
    if (!ids.length) return [];

    const conversations = await Promise.all(ids.map((id) => this.getConversationById(id, userId)));
    return conversations
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
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
    return mapConversation({ ...conversation, participants, messages }, currentUserId);
  }
}

module.exports = new ChatService();
