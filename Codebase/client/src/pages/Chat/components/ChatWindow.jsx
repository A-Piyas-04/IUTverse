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
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="conversation-avatar">
            {otherUser?.name
              ? otherUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
              : "?"}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {otherUser?.name || "Unknown User"}
            </h2>
            <p className="text-sm text-gray-500">{otherUser?.email}</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-messages">
        {loading && messages.length === 0 ? (
          <div className="text-center text-gray-500">
            <div className="animate-pulse">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-3xl mb-3">👋</div>
            <p>Start your conversation with {otherUser?.name}!</p>
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
                className="message-appear"
              >
                {showTime && (
                  <div className="text-center text-xs text-gray-400 mb-2">
                    {formatTime(message.sentAt)}
                  </div>
                )}
                <div
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`message-bubble px-4 py-2 rounded-lg ${
                      isOwn ? "sent" : "received"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">
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
        className="p-4 border-t border-gray-200 bg-white"
      >
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${otherUser?.name || "user"}...`}
              className="chat-input w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
              rows="1"
              disabled={sendingMessage}
            />
          </div>
          <button
            type="submit"
            disabled={!messageInput.trim() || sendingMessage}
            className="send-button bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingMessage ? (
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </div>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
