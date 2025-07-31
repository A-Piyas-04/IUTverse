const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedDepartments() {
  console.log("🌱 Seeding departments...");

  const departments = [
    "CSE", // Computer Science and Engineering
    "EEE", // Electrical and Electronic Engineering
    "CE", // Civil Engineering
    "ME", // Mechanical Engineering
    "IPE", // Industrial and Production Engineering
    "TE", // Textile Engineering
    "EnvE", // Environmental Engineering
    "ChE", // Chemical Engineering
    "MPE", // Materials and Petroleum Engineering
    "BBA", // Bachelor of Business Administration
    "Economics",
    "English",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Statistics",
  ];

  try {
    for (const deptName of departments) {
      await prisma.department.upsert({
        where: { name: deptName },
        update: {},
        create: { name: deptName },
      });
      console.log(`✅ Department '${deptName}' created/updated`);
    }

    console.log("🎉 Department seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding departments:", error);
    throw error;
  }
}

async function main() {
  try {
    await seedDepartments();
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { seedDepartments };
