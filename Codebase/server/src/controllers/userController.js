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

// Update student ID
const updateStudentId = async (req, res) => {
  try {
    const { studentId } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (
      !studentId ||
      typeof studentId !== "string" ||
      studentId.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Student ID is required and must be a non-empty string",
      });
    }

    // Trim and validate student ID format
    const trimmedStudentId = studentId.trim();

    // Basic student ID format validation (adjust pattern as needed)
    const studentIdPattern = /^[A-Za-z0-9-]+$/;
    if (!studentIdPattern.test(trimmedStudentId)) {
      return res.status(400).json({
        message:
          "Student ID contains invalid characters. Only letters, numbers, and hyphens are allowed",
      });
    }

    if (trimmedStudentId.length < 3 || trimmedStudentId.length > 20) {
      return res.status(400).json({
        message: "Student ID must be between 3 and 20 characters long",
      });
    }

    // Check if student ID already exists (excluding current user)
    const exists = await userService.checkStudentIdExists(
      trimmedStudentId,
      userId
    );
    if (exists) {
      return res.status(409).json({
        message: "This student ID is already taken by another user",
      });
    }

    // Update user's student ID
    const updatedUser = await userService.updateStudentId(
      userId,
      trimmedStudentId
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Student ID updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating student ID:", error);
    if (error.message === "Student ID already exists") {
      return res.status(409).json({
        message: "This student ID is already taken by another user",
      });
    }
    res.status(500).json({
      message: "Internal server error. Please try again.",
    });
  }
};

// Get student ID
const getStudentId = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user data including student ID
    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        studentId: user.studentId,
      },
    });
  } catch (error) {
    console.error("Error getting student ID:", error);
    res.status(500).json({
      message: "Internal server error. Please try again.",
    });
  }
};

// Delete student ID
const deleteStudentId = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Clear user's student ID
    const updatedUser = await userService.deleteStudentId(userId);

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Student ID removed successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error deleting student ID:", error);
    res.status(500).json({
      message: "Internal server error. Please try again.",
    });
  }
};

// Check student ID availability
const checkStudentIdAvailability = async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.userId;

    // Validate student ID
    if (
      !studentId ||
      typeof studentId !== "string" ||
      studentId.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Valid student ID is required",
      });
    }

    const trimmedStudentId = studentId.trim();

    // Basic format validation
    const studentIdPattern = /^[A-Za-z0-9-]+$/;
    if (!studentIdPattern.test(trimmedStudentId)) {
      return res.status(400).json({
        message: "Student ID contains invalid characters",
        available: false,
      });
    }

    // Check availability (excluding current user)
    const exists = await userService.checkStudentIdExists(
      trimmedStudentId,
      userId
    );

    res.status(200).json({
      success: true,
      available: !exists,
      studentId: trimmedStudentId,
    });
  } catch (error) {
    console.error("Error checking student ID availability:", error);
    res.status(500).json({
      message: "Internal server error. Please try again.",
      available: false,
    });
  }
};

// Get user by student ID
const getUserByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Validate student ID
    if (
      !studentId ||
      typeof studentId !== "string" ||
      studentId.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Valid student ID is required",
      });
    }

    // Get user by student ID
    const user = await userService.getUserByStudentId(studentId.trim());

    if (!user) {
      return res.status(404).json({
        message: "User not found with this student ID",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error getting user by student ID:", error);
    res.status(500).json({
      message: "Internal server error. Please try again.",
    });
  }
};

module.exports = {
  updateUserName,
  getUserById,
  searchUsers,
  updateStudentId,
  getStudentId,
  deleteStudentId,
  checkStudentIdAvailability,
  getUserByStudentId,
};
