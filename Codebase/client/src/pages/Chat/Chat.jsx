import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar/Navbar.jsx";
import ConversationList from "./components/ConversationList.jsx";
import ChatWindow from "./components/ChatWindow.jsx";
import StartChatModal from "./components/StartChatModal.jsx";
import LoadingSpinner from "../../components/LoadingSpinner/LoadingSpinner.jsx";
import { useChat } from "../../hooks/useChat.js";
import { useLocation } from "react-router-dom";
import "./Chat.css";

export default function Chat() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const conversationId = searchParams.get("conversationId");
  const userId = searchParams.get("userId");

  const {
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    sendingMessage,
    startConversation,
    sendMessage,
    selectConversation,
    clearError,
  } = useChat();

  const [showStartChatModal, setShowStartChatModal] = useState(false);

  // Handle conversation selection from URL parameters
  useEffect(() => {
    if (!loading && conversations.length > 0) {
      if (conversationId) {
        console.log(
          "📱 Selecting conversation from URL param conversationId:",
          conversationId
        );
        const conversation = conversations.find((c) => c.id === conversationId);
        if (conversation) {
          selectConversation(conversation);
        }
      } else if (userId) {
        console.log(
          "👤 Starting conversation with userId from URL param:",
          userId
        );
        // Either select existing conversation with this user or start a new one
        const conversation = conversations.find(
          (c) => c.otherUser && c.otherUser.id === userId
        );

        if (conversation) {
          selectConversation(conversation);
        } else {
          // Start new conversation with this user
          startConversation(userId);
        }
      }
    }
  }, [
    conversations,
    loading,
    conversationId,
    userId,
    selectConversation,
    startConversation,
  ]);

  const handleStartChat = async (otherUserId) => {
    console.log(
      "💬 [Chat] handleStartChat called with otherUserId:",
      otherUserId
    );

    if (!otherUserId) {
      console.error("❌ [Chat] No otherUserId provided to handleStartChat");
      return;
    }

    try {
      console.log("💬 [Chat] Calling startConversation...");
      const result = await startConversation(otherUserId);
      console.log("💬 [Chat] startConversation result:", result);
      console.log("💬 [Chat] startConversation completed successfully");
      setShowStartChatModal(false);
      console.log("💬 [Chat] Modal closed");
    } catch (err) {
      console.error("❌ [Chat] Error in handleStartChat:", err);
      // Error is handled in the hook
    }
  };

  const handleSendMessage = async (content) => {
    try {
      await sendMessage(content);
    } catch (err) {
      // Error is handled in the hook
    }
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="min-h-screen chat-page-background">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="loading-spinner w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-green-600 font-semibold text-lg">
              Loading your conversations...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-y-hidden">
      <Navbar />

      <div className="chat-container w-full  mt-[80px]">
        <div className="chat-main-card bg-white rounded-none shadow-2xl border-0 h-[calc(100vh-80px)] flex overflow-hidden w-full">
          {/* Sidebar - Conversation List */}
          <div className="sidebar-container w-1/3 border-r border-gray-100 flex flex-col bg-gradient-to-b from-gray-50 to-white">
            {/* Header */}
            <div className="sidebar-header p-6 border-b border-gray-100 bg-gradient-to-r from-green-600 to-green-700">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="chat-icon">💬</span>
                  Messages
                </h1>
                <button
                  onClick={() => setShowStartChatModal(true)}
                  className="new-chat-btn bg-white bg-opacity-20 backdrop-blur-sm text-black px-4 py-2 rounded-xl text-sm font-medium hover:bg-opacity-30 transition-all duration-300 flex items-center gap-2 border border-white border-opacity-20"
                >
                  <span className="text-lg">✨</span>
                  New Chat
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message mx-6 mt-4 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                    <span className="text-red-500">⚠️</span>
                    {error}
                  </p>
                  <button
                    onClick={clearError}
                    className="text-red-500 hover:text-red-700 transition-colors duration-200 hover:bg-red-100 rounded-full p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto conversation-list-container">
              <ConversationList
                conversations={conversations}
                activeConversation={activeConversation}
                onSelectConversation={selectConversation}
                loading={loading}
              />
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col chat-area-container">
            {activeConversation ? (
              <ChatWindow
                conversation={activeConversation}
                messages={messages}
                onSendMessage={handleSendMessage}
                sendingMessage={sendingMessage}
                loading={loading}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center empty-chat-state">
                <div className="text-center">
                  <div className="empty-state-icon text-6xl mb-6 animate-bounce">
                    💬
                  </div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-3 gradient-text">
                    Welcome to Messages
                  </h3>
                  <p className="text-gray-500 text-lg mb-6">
                    Select a conversation from the list or start a new chat
                  </p>
                  <button
                    onClick={() => setShowStartChatModal(true)}
                    className="start-chat-cta bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    Start Your First Chat ✨
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Start Chat Modal */}
      {showStartChatModal && (
        <StartChatModal
          onStartChat={handleStartChat}
          onClose={() => setShowStartChatModal(false)}
        />
      )}
    </div>
  );
}
