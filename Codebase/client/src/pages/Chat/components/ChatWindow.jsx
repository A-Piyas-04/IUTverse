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
    console.log(
      "🔍 [ChatWindow] getOtherUser called, conversation:",
      conversation
    );

    const currentUserId = getCurrentUserId();
    console.log("🔍 [ChatWindow] Current user ID:", currentUserId);

    // Check if conversation has direct otherUser property
    if (conversation?.otherUser) {
      console.log(
        "👤 [DEBUG] Found otherUser directly in conversation:",
        conversation.otherUser
      );
      console.log(
        "👤 [DEBUG] Direct otherUser name from backend:",
        conversation.otherUser.name
      );
      console.log(
        "👤 [DEBUG] Direct otherUser name that will be displayed:",
        conversation.getCurrentUserId?.name || "Unknown User"
      );
      return conversation.otherUser;
    }

    // Look for other user in participants
    if (conversation?.participants) {
      console.log(
        "👥 [DEBUG] Looking for other user in participants:",
        conversation.participants
      );

      const otherParticipant = conversation.participants.find((p) => {
        console.log(
          "👥 [DEBUG] Checking participant:",
          p,
          "userId:",
          p?.userId,
          "userIdType:",
          typeof p?.userId,
          "currentUserId:",
          currentUserId,
          "currentUserIdType:",
          typeof currentUserId
        );
        // Use string comparison to handle type mismatches
        return (
          p && p.userId && p.userId.toString() !== currentUserId?.toString()
        );
      });

      if (otherParticipant) {
        console.log("👤 [DEBUG] Found other participant:", otherParticipant);
        console.log(
          "👤 [DEBUG] Other participant user object:",
          otherParticipant.user
        );

        const userData = otherParticipant.user;
        if (userData) {
          console.log(
            "👤 [DEBUG] Other user name from backend (participant.user):",
            userData.name
          );
          console.log(
            "👤 [DEBUG] Other user email from backend:",
            userData.email
          );
          console.log(
            "👤 [DEBUG] Other user name that will be displayed:",
            userData.getCurrentUserId?.name || "Unknown User"
          );
        } else {
          console.log(
            "👤 [DEBUG] No user object in participant, using participant directly"
          );
          console.log(
            "👤 [DEBUG] Participant name from backend:",
            otherParticipant.name
          );
          console.log(
            "👤 [DEBUG] Participant name that will be displayed:",
            otherParticipant.name || "Unknown User"
          );
        }

        return userData || otherParticipant;
      }
    }

    console.log("❌ [DEBUG] No other user found in conversation");
    return null;
  };

  // Helper function to get current user ID (matches useChat hook exactly)
  const getCurrentUserId = () => {
    const token = localStorage.getItem("token");
    console.log("🔑 [AUTH] Raw token exists:", !!token);
    console.log("🔑 [AUTH] Raw token length:", token?.length);
    console.log("🔑 [AUTH] localStorage keys:", Object.keys(localStorage));

    if (token) {
      try {
        // Split token and decode payload
        const tokenParts = token.split(".");
        console.log("🔑 [AUTH] Token parts count:", tokenParts.length);

        if (tokenParts.length !== 3) {
          console.error("🔑 [AUTH] Invalid token format - not 3 parts");
          return null;
        }

        const payload = JSON.parse(atob(tokenParts[1]));
        console.log("🔑 [AUTH] Full decoded token payload:", payload);

        // Try different possible user ID fields and log each attempt
        const userIdFields = ["userId", "id", "sub", "user_id"];
        const userIds = {};

        userIdFields.forEach((field) => {
          if (payload[field] !== undefined) {
            userIds[field] = {
              value: payload[field],
              type: typeof payload[field],
              toString: payload[field]?.toString(),
            };
          }
        });

        // Also check nested user object
        if (payload.user) {
          console.log("🔑 [AUTH] Nested user object:", payload.user);
          if (payload.user.id !== undefined) {
            userIds["user.id"] = {
              value: payload.user.id,
              type: typeof payload.user.id,
              toString: payload.user.id?.toString(),
            };
          }
          if (payload.user.userId !== undefined) {
            userIds["user.userId"] = {
              value: payload.user.userId,
              type: typeof payload.user.userId,
              toString: payload.user.userId?.toString(),
            };
          }
        }

        console.log("🔑 [AUTH] All possible user ID fields:", userIds);

        // Use the same logic as useChat.js, but with fallbacks
        let userId =
          payload.userId || payload.id || payload.sub || payload.user_id;

        // If still no userId found, try nested user object
        if (!userId && payload.user) {
          userId = payload.user.id || payload.user.userId;
        }

        console.log(
          "🔑 [AUTH] Selected userId (with fallbacks):",
          userId,
          "Type:",
          typeof userId
        );

        // CRITICAL: If we still don't have a userId, log all payload keys
        if (!userId) {
          console.error("🚨 [AUTH] No userId found in any expected fields!");
          console.error(
            "🚨 [AUTH] Available payload keys:",
            Object.keys(payload)
          );
          console.error(
            "🚨 [AUTH] Full payload for manual inspection:",
            payload
          );
        }

        return userId;
      } catch (error) {
        console.error("🔑 [AUTH] Error parsing token:", error);
        return null;
      }
    }
    console.warn("🔑 [AUTH] No token found in localStorage");
    return null;
  };

  const currentUserId = getCurrentUserId();
  const otherUser = getOtherUser();

  // FALLBACK: If token-based currentUserId is null, try to get it from conversation
  let effectiveCurrentUserId = currentUserId;
  if (!effectiveCurrentUserId && conversation?.participants) {
    console.log(
      "🔧 [FALLBACK] Trying to get currentUserId from conversation participants"
    );

    // Find the participant that is NOT the other user
    const possibleCurrentUser = conversation.participants.find((p) => {
      // If we have otherUser.id, exclude that participant
      if (otherUser?.id) {
        return p.userId && p.userId !== otherUser.id;
      }
      // Otherwise, just take the first participant (this is less reliable)
      return p.userId;
    });

    if (possibleCurrentUser) {
      effectiveCurrentUserId = possibleCurrentUser.userId;
      console.log(
        "🔧 [FALLBACK] Found effective currentUserId from conversation:",
        effectiveCurrentUserId
      );
    }
  }

  // CRITICAL DEBUG: Log the exact values we're working with
  console.log("🚨 [CRITICAL] currentUserId:", JSON.stringify(currentUserId));
  console.log(
    "🚨 [CRITICAL] effectiveCurrentUserId:",
    JSON.stringify(effectiveCurrentUserId)
  );
  console.log("🚨 [CRITICAL] currentUserId type:", typeof currentUserId);
  console.log("🚨 [CRITICAL] currentUserId is null:", currentUserId === null);
  console.log(
    "🚨 [CRITICAL] currentUserId is undefined:",
    currentUserId === undefined
  );
  console.log(
    "🚨 [CRITICAL] currentUserId toString():",
    currentUserId?.toString()
  );

  // Debug: Log what user name will be displayed in the chat window
  console.log("🖥️ [ChatWindow] Final user data for display:", {
    otherUser: otherUser,
    displayName: otherUser?.name || "Unknown User",
    email: otherUser?.email,
    conversation: conversation,
    currentUserId: currentUserId,
    currentUserIdType: typeof currentUserId,
  });

  // Debug: Log first few messages to understand the structure
  if (messages && messages.length > 0) {
    console.log("📨 [ChatWindow] Total messages:", messages.length);
    console.log("📨 [ChatWindow] First message structure:", {
      message: messages[0],
      senderId: messages[0]?.senderId,
      senderIdType: typeof messages[0]?.senderId,
      currentUserId: currentUserId,
      currentUserIdType: typeof currentUserId,
      directComparison: messages[0]?.senderId === currentUserId,
      stringComparison:
        messages[0]?.senderId?.toString() === currentUserId?.toString(),
    });

    // Log the last message (likely the most recent sent message)
    const lastMessage = messages[messages.length - 1];
    console.log("📨 [ChatWindow] Last message structure:", {
      message: lastMessage,
      senderId: lastMessage?.senderId,
      senderIdType: typeof lastMessage?.senderId,
      currentUserId: currentUserId,
      currentUserIdType: typeof currentUserId,
      directComparison: lastMessage?.senderId === currentUserId,
      stringComparison:
        lastMessage?.senderId?.toString() === currentUserId?.toString(),
    });

    // Show ownership calculation for all messages
    messages.forEach((msg, idx) => {
      const isOwn = msg.senderId?.toString() === currentUserId?.toString();
      console.log(
        `📨 [Message ${idx}] ${msg.content?.substring(
          0,
          20
        )}... -> isOwn: ${isOwn} (senderId: ${
          msg.senderId
        }, currentUserId: ${currentUserId})`
      );
    });
  }

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
            // CRITICAL: Log the exact comparison values
            console.log(`🚨 [CRITICAL Message ${index}] Raw values:`, {
              messageSenderId: message.senderId,
              currentUserId: currentUserId,
              effectiveCurrentUserId: effectiveCurrentUserId,
              messageSenderIdType: typeof message.senderId,
              currentUserIdType: typeof currentUserId,
              effectiveCurrentUserIdType: typeof effectiveCurrentUserId,
              messageSenderIdIsNull: message.senderId === null,
              messageSenderIdIsUndefined: message.senderId === undefined,
              currentUserIdIsNull: currentUserId === null,
              currentUserIdIsUndefined: currentUserId === undefined,
            });

            // Enhanced debugging for message ownership
            console.log(`🔍 [Message ${index}] Full message object:`, message);
            console.log(
              `🔍 [Message ${index}] Message senderId:`,
              message.senderId,
              `(type: ${typeof message.senderId})`
            );
            console.log(
              `🔍 [Message ${index}] Current userId:`,
              effectiveCurrentUserId,
              `(type: ${typeof effectiveCurrentUserId})`
            );

            // Try multiple comparison methods to handle different data types
            const senderIdStr = message.senderId?.toString();
            const currentUserIdStr = effectiveCurrentUserId?.toString();
            const senderIdNum = parseInt(message.senderId);
            const currentUserIdNum = parseInt(effectiveCurrentUserId);

            console.log(
              `🔍 [Message ${index}] String comparison: "${senderIdStr}" === "${currentUserIdStr}" = ${
                senderIdStr === currentUserIdStr
              }`
            );
            console.log(
              `� [Message ${index}] Number comparison: ${senderIdNum} === ${currentUserIdNum} = ${
                senderIdNum === currentUserIdNum
              }`
            );
            console.log(
              `🔍 [Message ${index}] Direct comparison: ${
                message.senderId
              } === ${effectiveCurrentUserId} = ${
                message.senderId === effectiveCurrentUserId
              }`
            );

            // SAFETY CHECK: If effectiveCurrentUserId is null/undefined, something is wrong
            if (
              effectiveCurrentUserId === null ||
              effectiveCurrentUserId === undefined
            ) {
              console.error(
                "🚨 [ERROR] effectiveCurrentUserId is null/undefined! Cannot determine message ownership!"
              );
              console.error(
                "🚨 [ERROR] This means both JWT token and conversation fallback failed"
              );
            }

            // Use multiple comparison methods for robustness with effectiveCurrentUserId
            let isOwn =
              message.senderId?.toString() ===
                effectiveCurrentUserId?.toString() ||
              parseInt(message.senderId) === parseInt(effectiveCurrentUserId) ||
              message.senderId === effectiveCurrentUserId;

            // TEMPORARY FIX: If we can't determine ownership due to null effectiveCurrentUserId,
            // let's try to identify the pattern by checking if this message was just sent
            if (
              !isOwn &&
              (effectiveCurrentUserId === null ||
                effectiveCurrentUserId === undefined)
            ) {
              console.log(
                "🔧 [TEMP FIX] Trying alternative ownership detection..."
              );

              // Method 1: Check if this is a recent message (last message in array is likely from current user if they just sent it)
              const isLastMessage = index === messages.length - 1;
              const timeDiff = new Date() - new Date(message.sentAt);
              const isRecent = timeDiff < 30000; // 30 seconds

              if (isLastMessage && isRecent) {
                console.log(
                  "🔧 [TEMP FIX] This appears to be a recently sent message, treating as own"
                );
                isOwn = true;
              }

              // Method 2: Check if sender name matches the current user somehow
              // We can try to identify this from the conversation participants
              if (!isOwn && conversation?.participants) {
                const currentParticipant = conversation.participants.find(
                  (p) =>
                    p.userId &&
                    p.userId.toString() !== otherUser?.id?.toString()
                );

                if (
                  currentParticipant &&
                  message.senderId === currentParticipant.userId
                ) {
                  console.log(
                    "🔧 [TEMP FIX] Message sender matches current participant, treating as own"
                  );
                  isOwn = true;
                }
              }

              // Method 3: If we have the other user's ID from conversation, and it's NOT that user
              if (
                !isOwn &&
                otherUser?.id &&
                message.senderId !== otherUser.id
              ) {
                console.log(
                  "🔧 [TEMP FIX] Message not from other user, treating as own"
                );
                isOwn = true;
              }
            }

            console.log(`✅ [Message ${index}] Final isOwn result:`, isOwn);

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
                    className={`message-bubble px-4 py-3 rounded-2xl max-w-xs lg:max-w-md xl:max-w-lg shadow-sm transition-all duration-200 ${
                      isOwn
                        ? "sent bg-gradient-to-r from-blue-500 to-blue-600 text-white ml-12 rounded-br-sm"
                        : "received bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-300 text-gray-800 mr-12 rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    {/* Add a small indicator for message ownership */}
                    <div
                      className={`text-xs mt-1 ${
                        isOwn ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {isOwn ? "You" : otherUser?.name || "Other"}
                    </div>
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
