import { useState, useEffect, useCallback } from "react";
import chatApi from "../services/chatApi.js";

export const useChat = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Load user's conversations
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await chatApi.getConversations();

      // Handle different possible response structures
      let conversations = [];
      if (response && response.data && response.data.data) {
        // Nested structure: response.data.data (like your current API)
        conversations = Array.isArray(response.data.data)
          ? response.data.data
          : [];
      } else if (response && response.data) {
        // Direct structure: response.data
        conversations = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        // Array response
        conversations = response;
      }

      setConversations(conversations);
    } catch (err) {
      setError("Failed to load conversations");
      console.error("Error loading conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start a new conversation
  const startConversation = useCallback(async (otherUserId) => {
    console.log("🚀 startConversation called with otherUserId:", otherUserId);
    try {
      setError(null);
      console.log("📡 Calling chatApi.startConversation...");
      const response = await chatApi.startConversation(otherUserId);
      console.log("📡 API response received:", response);

      // Handle different response structures - check multiple possible locations
      const conversation =
        response?.conversation ||
        response?.data?.conversation ||
        response?.data;
      console.log("💬 Extracted conversation:", conversation);

      if (!conversation) {
        console.error("❌ No conversation in response:", response);
        throw new Error(
          "Failed to create conversation - no conversation data received"
        );
      }

      if (!conversation.id) {
        console.error("❌ Conversation has no ID:", conversation);
        throw new Error(
          "Failed to create conversation - conversation has no ID"
        );
      }

      console.log("✅ Valid conversation received with ID:", conversation.id);

      // Get current user ID for comparison
      const currentUserId = getCurrentUserId();
      console.log("👤 [DEBUG] Current user ID:", currentUserId);
      console.log("👤 [DEBUG] Current user ID type:", typeof currentUserId);
      console.log("👤 [DEBUG] Requested otherUserId:", otherUserId);
      console.log("👤 [DEBUG] Requested otherUserId type:", typeof otherUserId);

      // Debug: Check what user information is available in the conversation
      console.log("👤 [DEBUG] User info in conversation:", {
        conversation: conversation,
        participants: conversation.participants,
        currentUserId: currentUserId,
        requestedUserId: otherUserId,
      });

      // Debug each participant to understand the structure
      if (conversation.participants) {
        conversation.participants.forEach((p, index) => {
          console.log(`👥 [DEBUG] Participant ${index}:`, {
            userId: p?.userId,
            userIdType: typeof p?.userId,
            userName: p?.user?.name,
            userEmail: p?.user?.email,
            isCurrentUser: p?.userId?.toString() === currentUserId?.toString(),
            isRequestedUser: p?.userId?.toString() === otherUserId?.toString(),
          });
        });
      }

      // Extract the other user's information for debugging (should be the person we're chatting with)
      // We want to show the name of the user we're trying to chat with (otherUserId)
      const otherUser = conversation.participants?.find(
        (p) => p && p.userId && p.userId.toString() === otherUserId?.toString()
      );
      if (otherUser) {
        console.log("👤 [DEBUG] Other user from backend:", {
          userId: otherUser.userId,
          userName: otherUser.user?.name || otherUser.name || "Unknown",
          userEmail: otherUser.user?.email || otherUser.email,
          fullUserObject: otherUser.user || otherUser,
        });
        console.log(
          "👤 [DEBUG] User name that will be displayed:",
          otherUser.user?.name || otherUser.name || "Unknown User"
        );
      } else {
        console.log(
          "👤 [DEBUG] No other user found in conversation participants"
        );
      }

      // Update conversations list
      setConversations((prev) => {
        // Ensure prev is an array and filter out invalid entries
        const safeConversations = Array.isArray(prev)
          ? prev.filter((c) => c && c.id)
          : [];
        console.log("📝 Current safe conversations:", safeConversations);
        const exists = safeConversations.find(
          (c) => c && c.id === conversation.id
        );
        if (exists) {
          console.log(
            "📝 Conversation already exists, returning existing list"
          );
          return safeConversations;
        }
        console.log("📝 Adding new conversation to list");
        return [conversation, ...safeConversations];
      });

      // Set as active conversation
      console.log("📝 Setting active conversation:", conversation);
      setActiveConversation(conversation);
      return conversation;
    } catch (err) {
      setError("Failed to start conversation");
      console.error("Error starting conversation:", err);
      throw err;
    }
  }, []);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId, page = 1) => {
    try {
      setLoading(page === 1); // Only show loading for first page
      setError(null);

      const response = await chatApi.getMessages(conversationId, page);

      // Handle different possible response structures for messages
      let newMessages = [];
      if (response && response.data && response.data.data) {
        // Nested structure: response.data.data
        newMessages = Array.isArray(response.data.data)
          ? response.data.data
          : [];
      } else if (response && response.data) {
        // Direct structure: response.data
        newMessages = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        // Array response
        newMessages = response;
      }

      if (page === 1) {
        setMessages(newMessages);
      } else {
        // Append for pagination
        setMessages((prev) => [...newMessages, ...prev]);
      }

      // Mark messages as read
      await chatApi.markAsRead(conversationId);

      return newMessages;
    } catch (err) {
      setError("Failed to load messages");
      console.error("Error loading messages:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(
    async (content) => {
      if (!activeConversation || !content.trim()) return;

      try {
        setSendingMessage(true);
        setError(null);

        // Find the other participant - handle different conversation structures
        let otherParticipantId;

        if (activeConversation.otherUser) {
          // Structure from getConversations: { otherUser: { id, name, email } }
          otherParticipantId = activeConversation.otherUser.id;
        } else if (activeConversation.participants) {
          // Structure from startConversation: { participants: [{ userId, user }] }
          const otherParticipant = activeConversation.participants.find(
            (p) => p && p.userId && p.userId !== getCurrentUserId()
          );
          otherParticipantId = otherParticipant?.userId;
        }

        if (!otherParticipantId) {
          throw new Error("Cannot find conversation participant");
        }

        const response = await chatApi.sendMessage(
          activeConversation.id,
          otherParticipantId,
          content.trim()
        );

        // Handle nested response structure for sent message
        let sentMessage;
        if (response && response.data && response.data.data) {
          sentMessage = response.data.data;
        } else if (response && response.data) {
          sentMessage = response.data;
        }

        // Add message to current messages
        if (sentMessage) {
          setMessages((prev) => [...prev, sentMessage]);
        }

        // Update conversation list to show latest message
        if (sentMessage) {
          setConversations((prev) =>
            Array.isArray(prev)
              ? prev
                  .map((conv) =>
                    conv && conv.id === activeConversation.id
                      ? {
                          ...conv,
                          lastMessage: sentMessage,
                          updatedAt: new Date().toISOString(),
                        }
                      : conv
                  )
                  .filter((conv) => conv && conv.id)
              : []
          );
        }

        return sentMessage;
      } catch (err) {
        setError("Failed to send message");
        console.error("Error sending message:", err);
        throw err;
      } finally {
        setSendingMessage(false);
      }
    },
    [activeConversation]
  );

  // Helper function to get current user ID (you'll need to implement this based on your auth context)
  const getCurrentUserId = () => {
    // This should get the user ID from your auth context
    // For now, returning a placeholder - you'll need to integrate with your auth system
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.userId;
      } catch {
        return null;
      }
    }
    return null;
  };

  // Select a conversation
  const selectConversation = useCallback(
    async (conversation) => {
      console.log("🎯 selectConversation called with:", conversation);
      if (!conversation) {
        console.error("❌ selectConversation: No conversation provided");
        return;
      }
      if (!conversation.id) {
        console.error(
          "❌ selectConversation: Conversation has no ID",
          conversation
        );
        return;
      }
      console.log("✅ Setting active conversation:", conversation);
      setActiveConversation(conversation);
      console.log("🔄 Loading messages for conversation ID:", conversation.id);
      await loadMessages(conversation.id);
    },
    [loadMessages]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    sendingMessage,
    loadConversations,
    startConversation,
    loadMessages,
    sendMessage,
    selectConversation,
    clearError,
  };
};
