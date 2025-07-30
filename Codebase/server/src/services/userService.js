const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const fileUploadService = require("./fileUploadService");

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

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
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
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  // Upload profile picture
  async uploadProfilePicture(userId, fileBuffer, originalName) {
    try {
      // Get current profile to check for existing picture
      const currentProfile = await prisma.profile.findUnique({
        where: { userId },
        select: { profilePicture: true },
      });

      // Save new profile picture
      const newPicturePath = await fileUploadService.saveProfilePicture(
        fileBuffer,
        originalName
      );

      // Update profile with new picture path
      const updatedProfile = await prisma.profile.upsert({
        where: { userId },
        update: { profilePicture: newPicturePath },
        create: {
          userId,
          profilePicture: newPicturePath,
        },
      });

      // Delete old picture file if it exists
      if (currentProfile?.profilePicture) {
        await fileUploadService.deleteFile(currentProfile.profilePicture);
      }

      return updatedProfile;
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      throw error;
    }
  }

  // Upload cover picture
  async uploadCoverPicture(userId, fileBuffer, originalName) {
    try {
      // Get current profile to check for existing picture
      const currentProfile = await prisma.profile.findUnique({
        where: { userId },
        select: { coverPicture: true },
      });

      // Save new cover picture
      const newPicturePath = await fileUploadService.saveCoverPicture(
        fileBuffer,
        originalName
      );

      // Update profile with new picture path
      const updatedProfile = await prisma.profile.upsert({
        where: { userId },
        update: { coverPicture: newPicturePath },
        create: {
          userId,
          coverPicture: newPicturePath,
        },
      });

      // Delete old picture file if it exists
      if (currentProfile?.coverPicture) {
        await fileUploadService.deleteFile(currentProfile.coverPicture);
      }

      return updatedProfile;
    } catch (error) {
      console.error("Error uploading cover picture:", error);
      throw error;
    }
  }

  // Delete profile picture
  async deleteProfilePicture(userId) {
    try {
      // Get current profile picture path
      const currentProfile = await prisma.profile.findUnique({
        where: { userId },
        select: { profilePicture: true },
      });

      if (!currentProfile?.profilePicture) {
        throw new Error("No profile picture to delete");
      }

      // Update profile to remove picture reference
      const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: { profilePicture: null },
      });

      // Delete the actual file
      await fileUploadService.deleteFile(currentProfile.profilePicture);

      return updatedProfile;
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      throw error;
    }
  }

  // Delete cover picture
  async deleteCoverPicture(userId) {
    try {
      // Get current cover picture path
      const currentProfile = await prisma.profile.findUnique({
        where: { userId },
        select: { coverPicture: true },
      });

      if (!currentProfile?.coverPicture) {
        throw new Error("No cover picture to delete");
      }

      // Update profile to remove picture reference
      const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: { coverPicture: null },
      });

      // Delete the actual file
      await fileUploadService.deleteFile(currentProfile.coverPicture);

      return updatedProfile;
    } catch (error) {
      console.error("Error deleting cover picture:", error);
      throw error;
    }
  }

  // Get profile pictures
  async getProfilePictures(userId) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: {
          profilePicture: true,
          coverPicture: true,
        },
      });

      return profile || { profilePicture: null, coverPicture: null };
    } catch (error) {
      console.error("Error getting profile pictures:", error);
      throw error;
    }
  }

  // Search users by name, email, or student ID
  async searchUsers(searchTerm, currentUserId) {
    try {
      const users = await prisma.user.findMany({
        where: {
          AND: [
            {
              // Exclude current user from results
              id: {
                not: parseInt(currentUserId),
              },
            },
            {
              OR: [
                {
                  name: {
                    contains: searchTerm,
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: searchTerm,
                    mode: "insensitive",
                  },
                },
                {
                  studentId: {
                    contains: searchTerm,
                    mode: "insensitive",
                  },
                },
              ],
            },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          batch: true,
          studentId: true,
          profile: {
            select: {
              profilePicture: true,
            },
          },
        },
        take: 20, // Limit results to prevent performance issues
        orderBy: {
          name: "asc",
        },
      });

      return users;
    } catch (error) {
      console.error("Error searching users:", error);
      throw error;
    }
  }

  // Close database connection
  async disconnect() {
    await prisma.$disconnect();
  }
}

module.exports = new UserService();
