import React, { useState } from "react";
import Navbar from "../../components/Navbar/Navbar.jsx";
import ConversationList from "./components/ConversationList.jsx";
import ChatWindow from "./components/ChatWindow.jsx";
import StartChatModal from "./components/StartChatModal.jsx";
import LoadingSpinner from "../../components/LoadingSpinner/LoadingSpinner.jsx";
import { useChat } from "../../hooks/useChat.js";
import "./Chat.css";

export default function Chat() {
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

  const handleStartChat = async (otherUserId) => {
    try {
      await startConversation(otherUserId);
      setShowStartChatModal(false);
    } catch (err) {
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border h-[calc(100vh-120px)] flex">
          {/* Sidebar - Conversation List */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">Chats</h1>
                <button
                  onClick={() => setShowStartChatModal(true)}
                  className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  New Chat
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-red-700 text-sm">{error}</p>
                  <button
                    onClick={clearError}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={conversations}
                activeConversation={activeConversation}
                onSelectConversation={selectConversation}
                loading={loading}
              />
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {activeConversation ? (
              <ChatWindow
                conversation={activeConversation}
                messages={messages}
                onSendMessage={handleSendMessage}
                sendingMessage={sendingMessage}
                loading={loading}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-4">💬</div>
                  <h3 className="text-lg font-medium mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-sm">
                    Choose a conversation from the list or start a new chat
                  </p>
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
