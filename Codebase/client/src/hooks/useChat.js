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
    try {
      setError(null);
      const response = await chatApi.startConversation(otherUserId);
      const conversation = response.conversation;

      // Update conversations list
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conversation.id);
        if (exists) return prev;
        return [conversation, ...prev];
      });

      // Set as active conversation
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
            (p) => p.userId !== getCurrentUserId()
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
            prev.map((conv) =>
              conv.id === activeConversation.id
                ? {
                    ...conv,
                    lastMessage: sentMessage,
                    updatedAt: new Date().toISOString(),
                  }
                : conv
            )
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
      setActiveConversation(conversation);
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
