const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testCourseCodeFeature() {
  try {
    console.log("🧪 Testing Course Code feature...");

    // Create a test resource with course code
    const testResource = await prisma.academicResource.create({
      data: {
        title: "Test Resource with Course Code",
        type: "QUESTION",
        courseCode: "CSE 101",
        departmentId: 1, // Assuming department with ID 1 exists
        fileUrl: "/files/test.pdf",
      },
      include: {
        department: true,
      },
    });

    console.log("✅ Created test resource:", testResource);

    // Test filtering by course code
    const filteredResources = await prisma.academicResource.findMany({
      where: {
        courseCode: {
          contains: "CSE",
          mode: "insensitive",
        },
      },
      include: {
        department: true,
      },
    });

    console.log("✅ Filtered resources by course code:", filteredResources);

    // Clean up - delete the test resource
    await prisma.academicResource.delete({
      where: { id: testResource.id },
    });

    console.log("✅ Cleaned up test resource");
    console.log("🎉 Course Code feature test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCourseCodeFeature();
