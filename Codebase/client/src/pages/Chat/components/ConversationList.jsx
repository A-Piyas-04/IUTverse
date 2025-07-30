import React from "react";

const ConversationList = ({
  conversations,
  activeConversation,
  onSelectConversation,
  loading,
}) => {
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

  if (loading && conversations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-pulse">Loading conversations...</div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-3xl mb-3">📭</div>
        <h3 className="font-medium mb-1">No conversations yet</h3>
        <p className="text-sm">Start a new chat to begin messaging</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          onClick={() => onSelectConversation(conversation)}
          className={`conversation-item p-4 cursor-pointer ${
            activeConversation?.id === conversation.id ? "active" : ""
          }`}
        >
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className="conversation-avatar">
              {getInitials(conversation.otherUser?.name)}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {conversation.otherUser?.name || "Unknown User"}
                </h4>
                {conversation.lastMessage && (
                  <span className="message-time text-gray-500">
                    {formatTime(conversation.lastMessage.sentAt)}
                  </span>
                )}
              </div>

              {/* Last message or email */}
              <div className="mt-1">
                {conversation.lastMessage ? (
                  <p className="text-sm text-gray-600 truncate">
                    {conversation.lastMessage.content}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 truncate">
                    {conversation.otherUser?.email}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationList;
