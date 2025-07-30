const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  try {
    // Check if users 1 and 2 exist
    const user1 = await prisma.user.findUnique({ where: { id: 1 } });
    const user2 = await prisma.user.findUnique({ where: { id: 2 } });

    if (!user1 || !user2) {
      console.log(
        "❌ Users with ID 1 and 2 must exist before seeding chat data"
      );
      console.log("Creating dummy users first...");

      // Create user 1 if doesn't exist
      if (!user1) {
        await prisma.user.create({
          data: {
            id: 1,
            email: "user1@iut-dhaka.edu",
            passwordHash: "$2b$10$dummy.hash.for.user1",
            name: "Ahmed Rahman",
            department: "CSE",
            batch: 19,
            studentId: "IUT190001",
            isVerified: true,
            profile: {
              create: {
                bio: "Computer Science student passionate about web development",
                currentProgram: "B.Sc. in CSE",
                currentYear: "4th",
                currentSemester: "8th",
                hometown: "Dhaka",
                currentHall: "Hall 1",
                currentRoom: "A-101",
              },
            },
          },
        });
        console.log("✅ Created user 1: Ahmed Rahman");
      }

      // Create user 2 if doesn't exist
      if (!user2) {
        await prisma.user.create({
          data: {
            id: 2,
            email: "user2@iut-dhaka.edu",
            passwordHash: "$2b$10$dummy.hash.for.user2",
            name: "Fatima Khan",
            department: "EEE",
            batch: 19,
            studentId: "IUT190002",
            isVerified: true,
            profile: {
              create: {
                bio: "Electrical Engineering student interested in robotics",
                currentProgram: "B.Sc. in EEE",
                currentYear: "4th",
                currentSemester: "8th",
                hometown: "Chittagong",
                currentHall: "Hall 2",
                currentRoom: "B-205",
              },
            },
          },
        });
        console.log("✅ Created user 2: Fatima Khan");
      }
    }

    // Check if conversation already exists between user 1 and 2
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id: 1, user2Id: 2 },
          { user1Id: 2, user2Id: 1 },
        ],
      },
    });

    // Create conversation if it doesn't exist
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          user1Id: 1,
          user2Id: 2,
          lastMessageAt: new Date(),
          lastMessage: "Hey! How's your project going?",
        },
      });
      console.log("✅ Created conversation between user 1 and 2");
    } else {
      console.log("📝 Conversation already exists, adding messages to it");
    }

    // Check if messages already exist
    const existingMessages = await prisma.message.count({
      where: { conversationId: conversation.id },
    });

    if (existingMessages > 0) {
      console.log(
        `📝 Found ${existingMessages} existing messages, skipping message creation`
      );
      return;
    }

    // Create dummy messages between the users
    const dummyMessages = [
      {
        senderId: 1,
        receiverId: 2,
        content: "Hey Fatima! How's your robotics project going?",
        createdAt: new Date(Date.now() - 86400000 * 3), // 3 days ago
        isRead: true,
      },
      {
        senderId: 2,
        receiverId: 1,
        content:
          "Hi Ahmed! It's going well, thanks for asking. Working on the sensor integration part.",
        createdAt: new Date(Date.now() - 86400000 * 3 + 300000), // 3 days ago + 5 min
        isRead: true,
      },
      {
        senderId: 1,
        receiverId: 2,
        content:
          "That sounds challenging! Are you using Arduino or Raspberry Pi?",
        createdAt: new Date(Date.now() - 86400000 * 3 + 600000), // 3 days ago + 10 min
        isRead: true,
      },
      {
        senderId: 2,
        receiverId: 1,
        content:
          "Raspberry Pi 4. The processing power is really helpful for the computer vision part.",
        createdAt: new Date(Date.now() - 86400000 * 3 + 900000), // 3 days ago + 15 min
        isRead: true,
      },
      {
        senderId: 1,
        receiverId: 2,
        content:
          "Nice choice! I'm using OpenCV for my web app's image processing features.",
        createdAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
        isRead: true,
      },
      {
        senderId: 2,
        receiverId: 1,
        content:
          "OpenCV is great! BTW, are you coming to the tech fest next week?",
        createdAt: new Date(Date.now() - 86400000 * 2 + 1800000), // 2 days ago + 30 min
        isRead: true,
      },
      {
        senderId: 1,
        receiverId: 2,
        content: "Definitely! I'm planning to showcase my React project there.",
        createdAt: new Date(Date.now() - 86400000 * 1), // 1 day ago
        isRead: true,
      },
      {
        senderId: 2,
        receiverId: 1,
        content:
          "Awesome! I'll be presenting my robot. Maybe we can grab lunch together?",
        createdAt: new Date(Date.now() - 86400000 * 1 + 3600000), // 1 day ago + 1 hour
        isRead: true,
      },
      {
        senderId: 1,
        receiverId: 2,
        content:
          "Sounds like a plan! The cafeteria has that new biryani special 😋",
        createdAt: new Date(Date.now() - 43200000), // 12 hours ago
        isRead: true,
      },
      {
        senderId: 2,
        receiverId: 1,
        content: "Haha yes! I heard it's really good. See you there!",
        createdAt: new Date(Date.now() - 43200000 + 600000), // 12 hours ago + 10 min
        isRead: true,
      },
      {
        senderId: 1,
        receiverId: 2,
        content:
          "Hey, quick question - do you have the notes from Prof. Rahman's Algorithm class?",
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
        isRead: true,
      },
      {
        senderId: 2,
        receiverId: 1,
        content: "Sure! I'll send them over. They're in my Google Drive.",
        createdAt: new Date(Date.now() - 7200000 + 300000), // 2 hours ago + 5 min
        isRead: true,
      },
      {
        senderId: 2,
        receiverId: 1,
        content: "Here's the link: https://drive.google.com/algorithms-notes",
        createdAt: new Date(Date.now() - 7200000 + 600000), // 2 hours ago + 10 min
        isRead: true,
      },
      {
        senderId: 1,
        receiverId: 2,
        content: "Thank you so much! You're a lifesaver 🙏",
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        isRead: true,
      },
      {
        senderId: 2,
        receiverId: 1,
        content: "No problem! We're all in this together 😊",
        createdAt: new Date(Date.now() - 3600000 + 300000), // 1 hour ago + 5 min
        isRead: true,
      },
      {
        senderId: 1,
        receiverId: 2,
        content:
          "By the way, have you started working on the final project proposal?",
        createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
        isRead: false,
      },
      {
        senderId: 2,
        receiverId: 1,
        content:
          "Yes, I'm thinking of doing something with IoT and machine learning. What about you?",
        createdAt: new Date(Date.now() - 1200000), // 20 minutes ago
        isRead: false,
      },
      {
        senderId: 1,
        receiverId: 2,
        content:
          "That sounds amazing! I'm planning a full-stack web application with real-time features.",
        createdAt: new Date(Date.now() - 900000), // 15 minutes ago
        isRead: false,
      },
      {
        senderId: 2,
        receiverId: 1,
        content:
          "Cool! Maybe we can collaborate on some parts if they overlap.",
        createdAt: new Date(Date.now() - 600000), // 10 minutes ago
        isRead: false,
      },
      {
        senderId: 1,
        receiverId: 2,
        content:
          "That would be great! Let's discuss it tomorrow after the Algorithm class.",
        createdAt: new Date(Date.now() - 300000), // 5 minutes ago
        isRead: false,
      },
    ];

    // Insert all messages
    for (const messageData of dummyMessages) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: messageData.senderId,
          receiverId: messageData.receiverId,
          content: messageData.content,
          isRead: messageData.isRead,
          createdAt: messageData.createdAt,
        },
      });
    }

    // Update conversation with the latest message
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: dummyMessages[dummyMessages.length - 1].createdAt,
        lastMessage: dummyMessages[dummyMessages.length - 1].content,
        updatedAt: dummyMessages[dummyMessages.length - 1].createdAt,
      },
    });

    console.log(
      `✅ Successfully created ${dummyMessages.length} dummy messages between Ahmed and Fatima`
    );
    console.log("📊 Chat seeding completed!");

    // Display summary
    const totalMessages = await prisma.message.count({
      where: { conversationId: conversation.id },
    });

    const unreadCount = await prisma.message.count({
      where: {
        conversationId: conversation.id,
        isRead: false,
      },
    });

    console.log(`\n📈 Summary:`);
    console.log(`   Total messages: ${totalMessages}`);
    console.log(`   Unread messages: ${unreadCount}`);
    console.log(`   Conversation ID: ${conversation.id}`);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("🎉 Database seeding completed successfully!");
  })
  .catch(async (e) => {
    console.error("💥 Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
