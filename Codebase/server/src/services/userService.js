const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

class UserService {
  // Create a new user
  async createUser(email, password, additionalData = {}) {
    try {
      // Hash the password before storing
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          ...additionalData,
        },
      });

      console.log(`User created: ${email}`);
      return user;
    } catch (error) {
      if (error.code === "P2002") {
        throw new Error("User already exists");
      }
      throw error;
    }
  }

  // Find user by email
  async findUserByEmail(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          profile: true,
        },
      });
      return user;
    } catch (error) {
      console.error("Error finding user:", error);
      throw error;
    }
  }

  // Verify user password
  async verifyPassword(email, password) {
    try {
      const user = await this.findUserByEmail(email);
      if (!user) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      return isValid ? user : null;
    } catch (error) {
      console.error("Error verifying password:", error);
      throw error;
    }
  }

  // Get all users (for development/testing)
  async getAllUsers() {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          department: true,
          createdAt: true,
        },
      });
      return users;
    } catch (error) {
      console.error("Error getting users:", error);
      throw error;
    }
  }

  // Check if user exists
  async userExists(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      return !!user;
    } catch (error) {
      console.error("Error checking user existence:", error);
      throw error;
    }
  }

  // Get user by email (for token validation)
  async getUserByEmail(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          department: true,
          createdAt: true,
        },
      });
      return user;
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  }

  // Get profile by userId
  async getProfile(userId) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
      });
      return profile;
    } catch (error) {
      console.error("Error getting profile:", error);
      throw error;
    }
  }

  // Create profile
  async createProfile(userId, profileData) {
    try {
      const profile = await prisma.profile.create({
        data: {
          userId,
          ...profileData,
        },
      });
      return profile;
    } catch (error) {
      console.error("Error creating profile:", error);
      throw error;
    }
  }

  // Update profile
  async updateProfile(userId, profileData) {
    try {
      const profile = await prisma.profile.update({
        where: { userId },
        data: profileData,
      });
      return profile;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  // Update user name
  async updateUserName(userId, name) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { name },
        select: {
          id: true,
          email: true,
          name: true,
          department: true,
          batch: true,
          studentId: true,
          createdAt: true,
        },
      });
      return user;
    } catch (error) {
      console.error("Error updating user name:", error);
      throw error;
    }
  }

  // Close database connection
  async disconnect() {
    await prisma.$disconnect();
  }
}

module.exports = new UserService();
