const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedChatData() {
  try {
    console.log("🌱 Starting chat data seeding...");

    // First, check if users 1 and 2 exist
    const user1 = await prisma.user.findUnique({ where: { id: 1 } });
    const user2 = await prisma.user.findUnique({ where: { id: 2 } });

    if (!user1) {
      console.log(
        "❌ User with ID 1 not found. Please ensure users exist before seeding chat data."
      );
      return;
    }

    if (!user2) {
      console.log(
        "❌ User with ID 2 not found. Please ensure users exist before seeding chat data."
      );
      return;
    }

    console.log(
      `✅ Found users: ${user1.name || user1.email} and ${
        user2.name || user2.email
      }`
    );

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: {
            userId: {
              in: [1, 2],
            },
          },
        },
      },
      include: {
        participants: true,
        messages: true,
      },
    });

    if (
      existingConversation &&
      existingConversation.participants.length === 2
    ) {
      console.log(
        "⚠️ Conversation between users 1 and 2 already exists. Skipping creation."
      );
      console.log(`   Conversation ID: ${existingConversation.id}`);
      console.log(
        `   Existing messages: ${existingConversation.messages.length}`
      );
      return;
    }

    // Create conversation between user 1 and user 2
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: 1 }, { userId: 2 }],
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

    console.log(`✅ Created conversation with ID: ${conversation.id}`);

    // Sample messages for a realistic conversation
    const messages = [
      {
        senderId: 1,
        receiverId: 2,
        content: "Hey! How are you doing?",
        sentAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      },
      {
        senderId: 2,
        receiverId: 1,
        content: "Hi there! I'm doing great, thanks for asking. How about you?",
        sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000 - 30 * 60 * 1000), // 4.5 hours ago
      },
      {
        senderId: 1,
        receiverId: 2,
        content: "I'm good too! Are you ready for the upcoming exams?",
        sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        senderId: 2,
        receiverId: 1,
        content:
          "Honestly, I'm a bit stressed about them. Have you started studying for Data Structures?",
        sentAt: new Date(Date.now() - 3 * 60 * 60 * 1000 - 45 * 60 * 1000), // 3.75 hours ago
      },
      {
        senderId: 1,
        receiverId: 2,
        content:
          "Yeah, I've been working on it. The tree traversal problems are quite challenging!",
        sentAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      },
      {
        senderId: 2,
        receiverId: 1,
        content: "Tell me about it! Do you want to study together sometime?",
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000 - 30 * 60 * 1000), // 2.5 hours ago
      },
      {
        senderId: 1,
        receiverId: 2,
        content: "That sounds like a great idea! When are you free?",
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        senderId: 2,
        receiverId: 1,
        content: "How about tomorrow evening at the library? Around 6 PM?",
        sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000 - 45 * 60 * 1000), // 1.75 hours ago
      },
      {
        senderId: 1,
        receiverId: 2,
        content: "Perfect! I'll bring my notes on binary search trees.",
        sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
      {
        senderId: 2,
        receiverId: 1,
        content:
          "Great! I'll bring some practice problems. See you tomorrow! 📚",
        sentAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        senderId: 1,
        receiverId: 2,
        content:
          "Looking forward to it! Thanks for organizing this study session 😊",
        sentAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      },
      {
        senderId: 2,
        receiverId: 1,
        content: "No problem! We've got this! 💪",
        sentAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
    ];

    // Create messages one by one to maintain order
    let createdMessages = [];
    for (const messageData of messages) {
      const message = await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: messageData.senderId,
          receiverId: messageData.receiverId,
          content: messageData.content,
          sentAt: messageData.sentAt,
          isRead: true, // Mark older messages as read for realism
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
      createdMessages.push(message);
    }

    // Update conversation timestamp to match last message
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: messages[messages.length - 1].sentAt },
    });

    console.log(
      `✅ Created ${createdMessages.length} messages in the conversation`
    );
    console.log("📊 Chat data seeding completed successfully!");
    console.log("\n📱 Sample conversation:");
    createdMessages.slice(-3).forEach((msg, index) => {
      const sender =
        msg.senderId === 1
          ? user1.name || user1.email
          : user2.name || user2.email;
      console.log(`   ${sender}: ${msg.content}`);
    });
  } catch (error) {
    console.error("❌ Error seeding chat data:", error);
    throw error;
  }
}

async function main() {
  try {
    await seedChatData();
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { seedChatData };
