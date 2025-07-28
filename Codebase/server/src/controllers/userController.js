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

module.exports = {
  updateUserName,
};
