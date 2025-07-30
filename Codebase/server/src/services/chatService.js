const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

class ChatService {
  // Get or create a conversation between two users
  async getOrCreateConversation(userId1, userId2) {
    try {
      // Find existing conversation between these two users
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          participants: {
            every: {
              userId: {
                in: [userId1, userId2],
              },
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (
        existingConversation &&
        existingConversation.participants.length === 2
      ) {
        return existingConversation;
      }

      // Create new conversation
      const newConversation = await prisma.conversation.create({
        data: {
          participants: {
            create: [{ userId: userId1 }, { userId: userId2 }],
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return newConversation;
    } catch (error) {
      throw error;
    }
  }

  // Send a message
  async sendMessage(conversationId, senderId, receiverId, content) {
    try {
      // Verify conversation exists and user is participant
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: {
              userId: senderId,
            },
          },
        },
      });

      if (!conversation) {
        throw new Error("Conversation not found or access denied");
      }

      const message = await prisma.chatMessage.create({
        data: {
          conversationId,
          senderId,
          receiverId,
          content,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return message;
    } catch (error) {
      throw error;
    }
  }

  // Get messages in a conversation
  async getMessages(conversationId, userId, page = 1, limit = 50) {
    try {
      // Verify user is participant
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: {
              userId: userId,
            },
          },
        },
      });

      if (!conversation) {
        throw new Error("Conversation not found or access denied");
      }

      const messages = await prisma.chatMessage.findMany({
        where: {
          conversationId: conversationId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          sentAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      throw error;
    }
  }

  // Get user's conversations
  async getUserConversations(userId) {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId: userId,
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          messages: {
            orderBy: {
              sentAt: "desc",
            },
            take: 1, // Get last message
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      // Format conversations to show the other participant
      const formattedConversations = conversations.map((conv) => {
        const otherParticipant = conv.participants.find(
          (p) => p.userId !== userId
        );
        const lastMessage = conv.messages[0] || null;

        return {
          id: conv.id,
          otherUser: otherParticipant?.user,
          lastMessage: lastMessage,
          updatedAt: conv.updatedAt,
        };
      });

      return formattedConversations;
    } catch (error) {
      throw error;
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId, userId) {
    try {
      await prisma.chatMessage.updateMany({
        where: {
          conversationId: conversationId,
          receiverId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ChatService();
