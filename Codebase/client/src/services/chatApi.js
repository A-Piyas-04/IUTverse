// Chat API service
import ApiService from "./api.js";

class ChatApiService {
  // Start or get conversation with another user
  async startConversation(otherUserId) {
    console.log(
      "🌐 [ChatApi] startConversation called with otherUserId:",
      otherUserId
    );
    const response = await ApiService.request("/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ otherUserId }),
    });
    console.log("🌐 [ChatApi] startConversation API response:", response);
    console.log("🌐 [ChatApi] Response structure:", {
      hasConversation: !!response.conversation,
      hasData: !!response.data,
      dataType: typeof response.data,
      fullResponse: response,
    });
    return response;
  }

  // Get user's conversations
  async getConversations() {
    return ApiService.request("/chat/conversations", {
      method: "GET",
    });
  }

  // Send a message
  async sendMessage(conversationId, receiverId, content) {
    return ApiService.request("/chat/messages", {
      method: "POST",
      body: JSON.stringify({
        conversationId,
        receiverId,
        content,
      }),
    });
  }

  // Get messages in a conversation
  async getMessages(conversationId, page = 1, limit = 50) {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return ApiService.request(
      `/chat/conversations/${conversationId}/messages?${queryParams.toString()}`,
      {
        method: "GET",
      }
    );
  }

  // Mark messages as read
  async markAsRead(conversationId) {
    return ApiService.request(`/chat/conversations/${conversationId}/read`, {
      method: "PUT",
    });
  }
}

export default new ChatApiService();
