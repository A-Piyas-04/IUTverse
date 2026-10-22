import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { json } from "../http/responses";
import userService from "../services/userService";
import logger from "../utils/logger";
import { requiredText, sanitizePlainText, uuid } from "../utils/validation";

export const updateUserName: Handler = async (ctx) => {
  try {
    const nameResult = requiredText(ctx.body.name, "Name", { min: 2, max: 50 });
    if (!nameResult.ok) return response.badRequest(nameResult.error);
    const trimmedName = nameResult.value;
    const userId = ctx.user!.userId; // From the authenticated token

    // Update user's name
    const updatedUser = await userService.updateUserName(userId, trimmedName);

    if (!updatedUser) {
      return json(404, { message: "User not found" });
    }

    return json(200, {
      message: "Name updated successfully",
      user: {
        id: updatedUser.id,
        email: (updatedUser as any).email,
        name: updatedUser.name,
        department: updatedUser.department,
        batch: updatedUser.batch,
        studentId: updatedUser.studentId,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error updating user name:", error);
    return json(500, { message: "Internal server error. Please try again." });
  }
};

export const getUserById: Handler = async (ctx) => {
  try {
    const { userId } = ctx.params;

    // Validate userId
    const id = uuid(userId, "User ID");
    if (!id.ok) return response.badRequest(id.error);

    // Get user by ID
    const user = await userService.getPublicUserById(id.value);

    if (!user) {
      return json(404, { message: "User not found" });
    }

    return json(200, { success: true, data: user });
  } catch (error: any) {
    logger.error("Error getting user by ID:", error);
    return json(500, { message: "An error occurred while fetching user", error: error.message });
  }
};

// Search for users by name or email
export const searchUsers: Handler = async (ctx) => {
  try {
    const { q } = ctx.query;
    const currentUserId = ctx.user!.userId;

    if (!q || typeof q !== "string" || q.trim().length === 0) {
      return json(400, { message: "Search query is required" });
    }

    const query = sanitizePlainText(q, { max: 100 });
    if (query.length < 2) {
      return json(400, { message: "Search query must be at least 2 characters long" });
    }

    // Search for users excluding current user
    const users = await userService.searchUsers(query, currentUserId);

    return json(200, { success: true, data: users });
  } catch (error: any) {
    logger.error("Error searching users:", error);
    return json(500, { message: "An error occurred while searching users", error: error.message });
  }
};

// Update student ID
export const updateStudentId: Handler = async (ctx) => {
  try {
    const { studentId } = ctx.body;
    const userId = ctx.user!.userId;

    // Validate input
    if (
      !studentId ||
      typeof studentId !== "string" ||
      studentId.trim().length === 0
    ) {
      return json(400, { message: "Student ID is required and must be a non-empty string" });
    }

    // Trim and validate student ID format
    const trimmedStudentId = studentId.trim();

    // Basic student ID format validation (adjust pattern as needed)
    const studentIdPattern = /^[A-Za-z0-9-]+$/;
    if (!studentIdPattern.test(trimmedStudentId)) {
      return json(400, {
        message: "Student ID contains invalid characters. Only letters, numbers, and hyphens are allowed",
      });
    }

    if (trimmedStudentId.length < 3 || trimmedStudentId.length > 20) {
      return json(400, { message: "Student ID must be between 3 and 20 characters long" });
    }

    // Check if student ID already exists (excluding current user)
    const exists = await userService.checkStudentIdExists(trimmedStudentId, userId);
    if (exists) {
      return json(409, { message: "This student ID is already taken by another user" });
    }

    // Update user's student ID
    const updatedUser = await userService.updateStudentId(userId, trimmedStudentId);

    if (!updatedUser) {
      return json(404, { message: "User not found" });
    }

    return json(200, { message: "Student ID updated successfully", user: updatedUser });
  } catch (error: any) {
    logger.error("Error updating student ID:", error);
    if (error.message === "Student ID already exists") {
      return json(409, { message: "This student ID is already taken by another user" });
    }
    return json(500, { message: "Internal server error. Please try again." });
  }
};

// Get student ID
export const getStudentId: Handler = async (ctx) => {
  try {
    const userId = ctx.user!.userId;

    // Get user data including student ID
    const user = await userService.getUserById(userId);

    if (!user) {
      return json(404, { message: "User not found" });
    }

    return json(200, { success: true, data: { studentId: user.studentId } });
  } catch (error) {
    logger.error("Error getting student ID:", error);
    return json(500, { message: "Internal server error. Please try again." });
  }
};

// Delete student ID
export const deleteStudentId: Handler = async (ctx) => {
  try {
    const userId = ctx.user!.userId;

    // Clear user's student ID
    const updatedUser = await userService.deleteStudentId(userId);

    if (!updatedUser) {
      return json(404, { message: "User not found" });
    }

    return json(200, { message: "Student ID removed successfully", user: updatedUser });
  } catch (error) {
    logger.error("Error deleting student ID:", error);
    return json(500, { message: "Internal server error. Please try again." });
  }
};

// Check student ID availability
export const checkStudentIdAvailability: Handler = async (ctx) => {
  try {
    const { studentId } = ctx.params;
    const userId = ctx.user!.userId;

    // Validate student ID
    if (
      !studentId ||
      typeof studentId !== "string" ||
      studentId.trim().length === 0
    ) {
      return json(400, { message: "Valid student ID is required" });
    }

    const trimmedStudentId = studentId.trim();

    // Basic format validation
    const studentIdPattern = /^[A-Za-z0-9-]+$/;
    if (!studentIdPattern.test(trimmedStudentId)) {
      return json(400, { message: "Student ID contains invalid characters", available: false });
    }

    // Check availability (excluding current user)
    const exists = await userService.checkStudentIdExists(trimmedStudentId, userId);

    return json(200, { success: true, available: !exists, studentId: trimmedStudentId });
  } catch (error) {
    logger.error("Error checking student ID availability:", error);
    return json(500, { message: "Internal server error. Please try again.", available: false });
  }
};

// Get user by student ID
export const getUserByStudentId: Handler = async (ctx) => {
  try {
    const { studentId } = ctx.params;

    // Validate student ID
    if (
      !studentId ||
      typeof studentId !== "string" ||
      studentId.trim().length === 0
    ) {
      return json(400, { message: "Valid student ID is required" });
    }

    // Get user by student ID
    const user = await userService.getUserByStudentId(studentId.trim());

    if (!user) {
      return json(404, { message: "User not found with this student ID" });
    }

    return json(200, { success: true, data: user });
  } catch (error) {
    logger.error("Error getting user by student ID:", error);
    return json(500, { message: "Internal server error. Please try again." });
  }
};
