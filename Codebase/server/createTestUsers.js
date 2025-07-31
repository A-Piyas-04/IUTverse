// Demo script to create test users for Academic Resource Hub testing

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log("🚀 Creating test users for Academic Resource Hub...");

    // Create admin user (ID will be 1 if no other users exist)
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await prisma.user.upsert({
      where: { email: "admin@iut-dhaka.edu" },
      update: {},
      create: {
        email: "admin@iut-dhaka.edu",
        passwordHash: adminPassword,
        name: "Admin User",
        department: "CSE",
        batch: 20,
        studentId: "IUT-20-000001",
        isVerified: true,
      },
    });

    console.log("✅ Admin user created/updated:", {
      id: admin.id,
      email: admin.email,
      name: admin.name
    });

    // Create regular test user
    const userPassword = await bcrypt.hash("user123", 10);
    const user = await prisma.user.upsert({
      where: { email: "student@iut-dhaka.edu" },
      update: {},
      create: {
        email: "student@iut-dhaka.edu",
        passwordHash: userPassword,
        name: "Test Student",
        department: "CSE",
        batch: 22,
        studentId: "IUT-22-123456",
        isVerified: true,
      },
    });

    console.log("✅ Test user created/updated:", {
      id: user.id,
      email: user.email,
      name: user.name
    });

    console.log(`
🎉 Test users created successfully!

Admin User (has full access):
- Email: admin@iut-dhaka.edu
- Password: admin123
- User ID: ${admin.id}

Regular User (can upload and view):
- Email: student@iut-dhaka.edu
- Password: user123
- User ID: ${user.id}

💡 Login with admin credentials to test admin features like:
- Deleting resources
- Adding/removing departments
- Editing any resource

💡 Login with student credentials to test regular user features:
- Uploading resources
- Viewing all resources
- Searching and filtering
`);

  } catch (error) {
    console.error("❌ Error creating test users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
