const userService = require("../services/userService");

const updateUserName = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId; // From the authenticated token

    // Validate input
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        message: "Name is required and must be a non-empty string",
      });
    }

    // Trim and validate name length
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({
        message: "Name must be at least 2 characters long",
      });
    }

    if (trimmedName.length > 50) {
      return res.status(400).json({
        message: "Name must not exceed 50 characters",
      });
    }

    // Update user's name
    const updatedUser = await userService.updateUserName(userId, trimmedName);

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Name updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        department: updatedUser.department,
        batch: updatedUser.batch,
        studentId: updatedUser.studentId,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating user name:", error);
    res.status(500).json({
      message: "Internal server error. Please try again.",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({
        message: "Valid user ID is required",
      });
    }

    // Get user by ID
    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error getting user by ID:", error);
    res.status(500).json({
      message: "An error occurred while fetching user",
      error: error.message,
    });
  }
};

// Search for users by name or email
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.userId;

    if (!q || typeof q !== "string" || q.trim().length === 0) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const query = q.trim();
    if (query.length < 2) {
      return res.status(400).json({
        message: "Search query must be at least 2 characters long",
      });
    }

    // Search for users excluding current user
    const users = await userService.searchUsers(query, currentUserId);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({
      message: "An error occurred while searching users",
      error: error.message,
    });
  }
};

module.exports = {
  updateUserName,
  getUserById,
  searchUsers,
};
