const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const chatController = {
  // Get all conversations for the current user
  async getUserConversations(req, res) {
    try {
      console.log("getUserConversations called");
      console.log("req.user:", req.user);

      const userId = req.user.userId; // Use userId from JWT payload
      console.log("userId:", userId);

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID not found in request",
        });
      }

      // Validate userId is a valid integer
      const userIdInt = parseInt(userId);
      if (isNaN(userIdInt)) {
        console.error("Invalid userId format:", userId);
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format",
        });
      }

      console.log("Fetching conversations for userId:", userIdInt);
      
      const conversations = await prisma.conversation.findMany({
        where: {
          OR: [{ user1Id: userIdInt }, { user2Id: userIdInt }],
        },
        include: {
          user1: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              profile: {
                select: {
                  profilePicture: true,
                },
              },
            },
          },
          user2: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              profile: {
                select: {
                  profilePicture: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: {
              content: true,
              createdAt: true,
              senderId: true,
              isRead: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      console.log(`Found ${conversations.length} conversations`);

      // Format conversations to include the other user and unread count
      const formattedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          try {
            // Determine the other user in the conversation
            const otherUser =
              conversation.user1Id === userIdInt
                ? conversation.user2
                : conversation.user1;

            if (!otherUser) {
              console.error("Missing other user in conversation:", conversation.id);
              return null; // Will be filtered out later
            }

            // Count unread messages in this conversation
            const unreadCount = await prisma.message.count({
              where: {
                conversationId: conversation.id,
                receiverId: userIdInt,
                isRead: false,
              },
            });

            return {
              id: conversation.id,
              otherUser,
              lastMessage: conversation.messages[0] || null,
              unreadCount,
              updatedAt: conversation.updatedAt,
            };
          } catch (convError) {
            console.error(`Error processing conversation ${conversation.id}:`, convError);
            return null; // Will be filtered out later
          }
        })
      );

      // Filter out any null values from failed conversation processing
      const validConversations = formattedConversations.filter(conv => conv !== null);
      
      console.log(`Returning ${validConversations.length} valid conversations`);

      res.json({
        success: true,
        data: validConversations,
      });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch conversations",
        error: error.message || "Unknown error",
      });
    }
  },

  // Create a new conversation or get existing one
  async createOrGetConversation(req, res) {
    try {
      console.log("createOrGetConversation called");
      console.log("req.user:", req.user);
      console.log("req.body:", req.body);

      const userId = req.user.userId; // Current user ID from JWT
      const { otherUserId } = req.body; // ID of the user to chat with

      if (!userId) {
        console.error("Missing userId in request");
        return res.status(400).json({
          success: false,
          message: "User ID not found in request",
        });
      }

      if (!otherUserId) {
        console.error("Missing otherUserId in request body");
        return res.status(400).json({
          success: false,
          message: "Other user ID is required",
        });
      }

      // Parse and validate user IDs
      const userIdInt = parseInt(userId);
      const otherUserIdInt = parseInt(otherUserId);

      if (isNaN(userIdInt) || isNaN(otherUserIdInt)) {
        console.error("Invalid user ID format:", { userId, otherUserId });
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format",
        });
      }

      if (userIdInt === otherUserIdInt) {
        console.error("Cannot create conversation with self");
        return res.status(400).json({
          success: false,
          message: "Cannot create a conversation with yourself",
        });
      }

      console.log(`Checking if user ${otherUserIdInt} exists`);
      // Check if the other user exists
      const otherUser = await prisma.user.findUnique({
        where: { id: otherUserIdInt },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          profile: {
            select: {
              profilePicture: true,
            },
          },
        },
      });

      if (!otherUser) {
        console.error(`User with ID ${otherUserIdInt} not found`);
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Ensure consistent ordering (smaller ID first)
      const user1Id = Math.min(userIdInt, otherUserIdInt);
      const user2Id = Math.max(userIdInt, otherUserIdInt);

      console.log(`Checking for existing conversation between ${userIdInt} and ${otherUserIdInt}`);
      // Try to find existing conversation
      let conversation = await prisma.conversation.findUnique({
        where: {
          user1Id_user2Id: {
            user1Id,
            user2Id,
          },
        },
        include: {
          user1: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              profile: {
                select: {
                  profilePicture: true,
                },
              },
            },
          },
          user2: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              profile: {
                select: {
                  profilePicture: true,
                },
              },
            },
          },
        },
      });

      if (conversation) {
        console.log(`Found existing conversation with ID ${conversation.id}`);
        // Validate that both users exist in the conversation
        if (!conversation.user1 || !conversation.user2) {
          console.error(`Conversation ${conversation.id} has missing user data:`, {
            user1: conversation.user1 ? 'exists' : 'missing',
            user2: conversation.user2 ? 'exists' : 'missing'
          });
          
          // If conversation data is corrupted, create a new one
          console.log("Conversation data is corrupted, creating a new one");
          conversation = null; // Force creation of new conversation
        }
      }

      // If conversation doesn't exist or was corrupted, create it
      if (!conversation) {
        console.log("Creating new conversation");
        conversation = await prisma.conversation.create({
          data: {
            user1Id,
            user2Id,
          },
          include: {
            user1: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
                profile: {
                  select: {
                    profilePicture: true,
                  },
                },
              },
            },
            user2: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
                profile: {
                  select: {
                    profilePicture: true,
                  },
                },
              },
            },
          },
        });
        console.log(`Created new conversation with ID ${conversation.id}`);
      }

      // Validate the conversation data
      if (!conversation.user1 || !conversation.user2) {
        console.error("Conversation has missing user data");
        return res.status(500).json({
          success: false,
          message: "Failed to create conversation with complete user data",
        });
      }

      const responseOtherUser =
        conversation.user1Id === userIdInt
          ? conversation.user2
          : conversation.user1;

      console.log("Returning conversation data");
      res.json({
        success: true,
        data: {
          id: conversation.id,
          otherUser: responseOtherUser,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
      });
    } catch (error) {
      console.error("Error creating/getting conversation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create/get conversation",
        error: error.message || "Unknown error",
      });
    }
  },

  // Get messages in a specific conversation
  async getConversationMessages(req, res) {
    try {
      console.log("getConversationMessages called");
      console.log("req.user:", req.user);
      console.log("req.params:", req.params);
      console.log("req.query:", req.query);

      const userId = req.user.userId;
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      if (!userId) {
        console.error("Missing userId in request");
        return res.status(400).json({
          success: false,
          message: "User ID not found in request",
        });
      }

      if (!conversationId) {
        console.error("Missing conversationId in request params");
        return res.status(400).json({
          success: false,
          message: "Conversation ID is required",
        });
      }

      // Parse and validate IDs and pagination parameters
      const userIdInt = parseInt(userId);
      const conversationIdInt = parseInt(conversationId);
      const pageInt = parseInt(page);
      const limitInt = parseInt(limit);

      if (isNaN(userIdInt)) {
        console.error("Invalid userId format:", userId);
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format",
        });
      }

      if (isNaN(conversationIdInt)) {
        console.error("Invalid conversationId format:", conversationId);
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID format",
        });
      }

      if (isNaN(pageInt) || pageInt < 1) {
        console.error("Invalid page parameter:", page);
        return res.status(400).json({
          success: false,
          message: "Invalid page parameter",
        });
      }

      if (isNaN(limitInt) || limitInt < 1 || limitInt > 100) {
        console.error("Invalid limit parameter:", limit);
        return res.status(400).json({
          success: false,
          message: "Invalid limit parameter (must be between 1 and 100)",
        });
      }

      console.log(`Fetching messages for conversation ${conversationIdInt}, page ${pageInt}, limit ${limitInt}`);

      // Check if user is part of this conversation
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationIdInt,
          OR: [{ user1Id: userIdInt }, { user2Id: userIdInt }],
        },
      });

      if (!conversation) {
        console.error(`Conversation ${conversationIdInt} not found or user ${userIdInt} doesn't have access`);
        return res.status(403).json({
          success: false,
          message: "You don't have access to this conversation",
        });
      }

      console.log(`Found conversation ${conversationIdInt}, fetching messages`);
      // Get messages with pagination (newest first)
      const messages = await prisma.message.findMany({
        where: {
          conversationId: conversationIdInt,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              profile: {
                select: {
                  profilePicture: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (pageInt - 1) * limitInt,
        take: limitInt,
      });

      console.log(`Found ${messages.length} messages`);

      // Validate message data
      const validMessages = messages.filter(message => {
        if (!message.sender) {
          console.error(`Message ${message.id} has missing sender data`);
          return false;
        }
        return true;
      });

      if (validMessages.length !== messages.length) {
        console.warn(`Filtered out ${messages.length - validMessages.length} messages with missing sender data`);
      }

      // Reverse to show oldest first in the UI
      const reversedMessages = validMessages.reverse();

      console.log(`Returning ${reversedMessages.length} messages`);
      res.json({
        success: true,
        data: reversedMessages,
        pagination: {
          page: pageInt,
          limit: limitInt,
          hasMore: messages.length === limitInt,
        },
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch messages",
        error: error.message || "Unknown error",
      });
    }
  },

  // Send a message in a conversation
  async sendMessage(req, res) {
    try {
      console.log("sendMessage called");
      console.log("req.user:", req.user);
      console.log("req.params:", req.params);
      console.log("req.body:", req.body);

      const userId = req.user.userId;
      
      // Get conversationId from either params (new route) or body (legacy route)
      let conversationId = req.params.conversationId || req.body.conversationId;
      const { content } = req.body;

      if (!userId) {
        console.error("Missing userId in request");
        return res.status(400).json({
          success: false,
          message: "User ID not found in request",
        });
      }

      if (!conversationId || !content || content.trim() === "") {
        console.error("Missing required fields");
        return res.status(400).json({
          success: false,
          message: "conversationId and content are required",
        });
      }

      // Parse and validate IDs
      const userIdInt = parseInt(userId);
      const conversationIdInt = parseInt(conversationId);

      if (isNaN(userIdInt)) {
        console.error("Invalid userId format:", userId);
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format",
        });
      }

      if (isNaN(conversationIdInt)) {
        console.error("Invalid conversationId format:", conversationId);
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID format",
        });
      }

      console.log(`Checking if conversation ${conversationIdInt} exists and user ${userIdInt} is a participant`);
      // Check if user is part of this conversation
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationIdInt,
          OR: [{ user1Id: userIdInt }, { user2Id: userIdInt }],
        },
      });

      if (!conversation) {
        console.error(`Conversation ${conversationIdInt} not found or user ${userIdInt} doesn't have access`);
        return res.status(403).json({
          success: false,
          message: "You don't have access to this conversation",
        });
      }

      // Determine receiver ID
      const receiverId =
        conversation.user1Id === userIdInt
          ? conversation.user2Id
          : conversation.user1Id;

      console.log(`Sending message from user ${userIdInt} to user ${receiverId} in conversation ${conversationIdInt}`);
      // Create message and update conversation in a transaction
      const result = await prisma.$transaction(async (tx) => {
        try {
          // Create the message
          const message = await tx.message.create({
            data: {
              conversationId: conversationIdInt,
              senderId: userIdInt,
              receiverId,
              content: content.trim(),
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  profile: {
                    select: {
                      profilePicture: true,
                    },
                  },
                },
              },
            },
          });

          // Update conversation's last message and timestamp
          await tx.conversation.update({
            where: { id: conversationIdInt },
            data: {
              lastMessage: content.trim(),
              lastMessageAt: new Date(),
              updatedAt: new Date(),
            },
          });

          return message;
        } catch (txError) {
          console.error("Transaction error:", txError);
          throw new Error(`Transaction failed: ${txError.message}`);
        }
      });

      // Validate the message data
      if (!result.sender) {
        console.error("Created message has missing sender data");
        return res.status(500).json({
          success: false,
          message: "Failed to create message with complete sender data",
        });
      }

      console.log(`Message sent successfully with ID ${result.id}`);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send message",
        error: error.message || "Unknown error",
      });
    }
  },

  // Mark a specific message as read
  async markMessageAsRead(req, res) {
    try {
      const userId = req.user.userId;
      const { messageId } = req.params;

      const messageIdInt = parseInt(messageId);

      // Update message if user is the receiver
      const updatedMessage = await prisma.message.updateMany({
        where: {
          id: messageIdInt,
          receiverId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      if (updatedMessage.count === 0) {
        return res.status(404).json({
          success: false,
          message: "Message not found or already read",
        });
      }

      res.json({
        success: true,
        message: "Message marked as read",
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark message as read",
      });
    }
  },

  // Mark all messages in a conversation as read
  async markConversationAsRead(req, res) {
    try {
      console.log("markConversationAsRead called");
      console.log("req.user:", req.user);
      console.log("req.params:", req.params);

      const userId = req.user.userId;
      const { conversationId } = req.params;

      if (!userId) {
        console.error("Missing userId in request");
        return res.status(400).json({
          success: false,
          message: "User ID not found in request",
        });
      }

      if (!conversationId) {
        console.error("Missing conversationId in request params");
        return res.status(400).json({
          success: false,
          message: "Conversation ID is required",
        });
      }

      // Parse and validate IDs
      const userIdInt = parseInt(userId);
      const conversationIdInt = parseInt(conversationId);

      if (isNaN(userIdInt)) {
        console.error("Invalid userId format:", userId);
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format",
        });
      }

      if (isNaN(conversationIdInt)) {
        console.error("Invalid conversationId format:", conversationId);
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID format",
        });
      }

      console.log(`Checking if conversation ${conversationIdInt} exists and user ${userIdInt} is a participant`);
      // Check if conversation exists and user is a participant
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationIdInt,
          OR: [{ user1Id: userIdInt }, { user2Id: userIdInt }],
        },
      });

      if (!conversation) {
        console.error(`Conversation ${conversationIdInt} not found or user ${userIdInt} doesn't have access`);
        return res.status(404).json({
          success: false,
          message: "Conversation not found or you don't have access",
        });
      }

      console.log(`Marking unread messages as read in conversation ${conversationIdInt} for user ${userIdInt}`);
      // Mark all unread messages where user is the receiver as read
      const result = await prisma.message.updateMany({
        where: {
          conversationId: conversationIdInt,
          receiverId: userIdInt,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      console.log(`Marked ${result.count} messages as read`);
      res.json({
        success: true,
        data: {
          markedAsRead: result.count,
        },
      });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark conversation as read",
        error: error.message || "Unknown error",
      });
    }
  },

  // Delete a message (optional feature)
  async deleteMessage(req, res) {
    try {
      const userId = req.user.userId;
      const { messageId } = req.params;

      const messageIdInt = parseInt(messageId);

      // Check if user is the sender of this message
      const message = await prisma.message.findFirst({
        where: {
          id: messageIdInt,
          senderId: userId,
        },
      });

      if (!message) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own messages",
        });
      }

      // Delete the message
      await prisma.message.delete({
        where: { id: messageIdInt },
      });

      res.json({
        success: true,
        message: "Message deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete message",
      });
    }
  },

  // Get unread message count
  async getUnreadCount(req, res) {
    try {
      console.log("getUnreadCount called");
      console.log("req.user:", req.user);

      const userId = req.user.userId;

      if (!userId) {
        console.error("Missing userId in request");
        return res.status(400).json({
          success: false,
          message: "User ID not found in request",
        });
      }

      // Parse and validate userId
      const userIdInt = parseInt(userId);

      if (isNaN(userIdInt)) {
        console.error("Invalid userId format:", userId);
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format",
        });
      }

      console.log(`Fetching unread count for user ${userIdInt}`);
      const unreadCount = await prisma.message.count({
        where: {
          receiverId: userIdInt,
          isRead: false,
        },
      });

      console.log(`User ${userIdInt} has ${unreadCount} unread messages`);
      res.json({
        success: true,
        data: { unreadCount },
      });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch unread count",
        error: error.message || "Unknown error",
      });
    }
  },
};

module.exports = chatController;
