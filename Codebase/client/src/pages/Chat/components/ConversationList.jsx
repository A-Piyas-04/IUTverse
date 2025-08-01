import React from "react";
import ApiService from "../../../services/api.js";

const ConversationList = ({
  conversations,
  activeConversation,
  onSelectConversation,
  loading,
}) => {
  // Debug logging to understand the conversations structure
  console.log("📋 [ConversationList] Rendered with:", {
    conversationsLength: conversations?.length || 0,
    conversations: conversations,
    activeConversation: activeConversation,
    loading: loading,
  });
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
      // Less than 1 minute
      return "Just now";
    } else if (diff < 3600000) {
      // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Function to get user profile picture URL
  const getProfilePictureUrl = (userId) => {
    if (!userId) return null;
    return ApiService.getProfilePictureUrl(userId);
  };

  // Ensure conversations is always an array
  const safeConversations = Array.isArray(conversations) ? conversations : [];

  if (loading && safeConversations.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="loading-state">
          <div className="loading-spinner w-8 h-8 border-3 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-3"></div>
          <div className="text-gray-500 font-medium">
            Loading conversations...
          </div>
        </div>
      </div>
    );
  }

  if (safeConversations.length === 0) {
    return (
      <div className="p-8 text-center empty-conversations">
        <div className="empty-icon text-4xl mb-4 animate-pulse">📭</div>
        <h3 className="font-semibold text-gray-700 mb-2 text-lg">
          No conversations yet
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          Start a new chat to begin messaging with your friends
        </p>
      </div>
    );
  }

  return (
    <div className="conversation-list">
      {safeConversations
        .filter((conversation) => conversation && conversation.id) // Filter out invalid conversations
        .map((conversation, index) => (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation)}
            className={`conversation-item p-4 cursor-pointer transition-all duration-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 ${
              activeConversation?.id === conversation.id
                ? "active bg-gradient-to-r from-green-100 to-blue-100 border-r-4 border-green-500"
                : "hover:shadow-sm"
            }`}
            style={{
              animationDelay: `${index * 0.05}s`,
              animation: "slideInLeft 0.5s ease-out forwards",
            }}
          >
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="conversation-avatar relative w-12 h-12">
                {conversation.otherUser?.id ? (
                  <img
                    src={getProfilePictureUrl(conversation.otherUser.id)}
                    alt={conversation.otherUser?.name || "User"}
                    className="h-12 w-12 rounded-full object-cover border-2 border-green-200"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="avatar-gradient absolute inset-0 flex items-center justify-center text-white font-medium rounded-full"
                  style={{
                    display: conversation.otherUser?.id ? "none" : "flex",
                    background: "linear-gradient(135deg, #4ade80, #22c55e)",
                  }}
                >
                  {getInitials(conversation.otherUser?.name)}
                </div>
                <div className="online-indicator absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>

              <div className="flex-1 min-w-0 conversation-content">
                {/* Name and Time */}
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-gray-900 truncate conversation-name">
                    {conversation.otherUser?.name || "Unknown User"}
                  </h4>
                  {conversation.lastMessage && (
                    <span className="message-time text-xs text-gray-500 font-medium">
                      {formatTime(conversation.lastMessage.sentAt)}
                    </span>
                  )}
                </div>

                {/* Last message or email */}
                <div className="last-message-container">
                  {conversation.lastMessage ? (
                    <p className="text-sm text-gray-600 truncate leading-relaxed">
                      {conversation.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 truncate italic">
                      {conversation.otherUser?.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Unread indicator */}
              <div className="flex flex-col items-end">
                <div className="unread-badge"></div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default ConversationList;
