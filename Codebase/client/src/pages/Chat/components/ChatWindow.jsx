import React, { useState, useRef, useEffect } from "react";

const ChatWindow = ({
  conversation,
  messages,
  onSendMessage,
  sendingMessage,
  loading,
}) => {
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || sendingMessage) return;

    const content = messageInput.trim();
    setMessageInput("");

    try {
      await onSendMessage(content);
    } catch (err) {
      // Restore message on error
      setMessageInput(content);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getOtherUser = () => {
    return (
      conversation?.otherUser ||
      conversation?.participants?.find((p) => p.userId !== getCurrentUserId())
        ?.user
    );
  };

  // Helper function to get current user ID (should match the one in useChat hook)
  const getCurrentUserId = () => {
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

  const currentUserId = getCurrentUserId();
  const otherUser = getOtherUser();

  return (
    <div className="flex flex-col h-full chat-window">
      {/* Chat Header */}
      <div className="chat-header p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
        <div className="flex items-center space-x-4">
          <div className="conversation-avatar-large relative">
            <div className="avatar-gradient-large">
              {otherUser?.name
                ? otherUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                : "?"}
            </div>
            <div className="online-indicator-large"></div>
          </div>
          <div className="user-info">
            <h2 className="font-bold text-gray-900 text-lg">
              {otherUser?.name || "Unknown User"}
            </h2>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <span className="online-status">🟢 Online</span>
              {otherUser?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 chat-messages bg-gradient-to-b from-gray-50 to-white">
        {loading && messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="loading-messages">
              <div className="loading-spinner w-8 h-8 border-3 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-3"></div>
              <div className="text-gray-500 font-medium">
                Loading messages...
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 empty-messages">
            <div className="text-5xl mb-4 animate-bounce">👋</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Start the conversation!
            </h3>
            <p className="text-gray-500">
              Send your first message to {otherUser?.name}!
            </p>
          </div>
        ) : (
          (Array.isArray(messages) ? messages : []).map((message, index) => {
            const isOwn = message.senderId === currentUserId;
            const showTime =
              index === 0 ||
              new Date(message.sentAt) - new Date(messages[index - 1].sentAt) >
                300000; // 5 minutes

            return (
              <div
                key={message.id || `temp-${index}-${message.sentAt}`}
                className="message-container"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  animation: "messageSlideIn 0.4s ease-out forwards",
                }}
              >
                {showTime && (
                  <div className="text-center text-xs text-gray-400 mb-3 time-separator">
                    <span className="bg-white px-3 py-1 rounded-full shadow-sm border">
                      {formatTime(message.sentAt)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex ${
                    isOwn ? "justify-end" : "justify-start"
                  } message-row`}
                >
                  <div
                    className={`message-bubble px-4 py-3 rounded-2xl max-w-xs lg:max-w-md xl:max-w-lg shadow-sm ${
                      isOwn
                        ? "sent bg-gradient-to-r from-green-500 to-green-600 text-white"
                        : "received bg-white border border-gray-200 text-gray-800"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form
        onSubmit={handleSubmit}
        className="message-input-form p-6 border-t border-gray-100 bg-white"
      >
        <div className="flex items-end space-x-4">
          <div className="flex-1 message-input-container">
            <textarea
              ref={textareaRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${otherUser?.name || "user"}...`}
              className="chat-input w-full px-4 py-3 border-2 border-gray-200 rounded-2xl resize-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-300 bg-gray-50 focus:bg-white"
              rows="1"
              disabled={sendingMessage}
            />
          </div>
          <button
            type="submit"
            disabled={!messageInput.trim() || sendingMessage}
            className="send-button bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-2xl font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            {sendingMessage ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Send</span>
                <span className="text-lg">✈️</span>
              </div>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
