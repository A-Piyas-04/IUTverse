import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { json } from "../http/responses";
import catQAService from "../services/catQAService";
import logger from "../utils/logger";
import { canViewContent } from "../utils/contentVisibility";
import { positiveInt, requiredText } from "../utils/validation";

const statusFor = (message: string, ...extra: [string, number][]) => {
  if (message.includes("not found")) return 404;
  for (const [fragment, status] of extra) if (message.includes(fragment)) return status;
  return 500;
};

// Get all questions with answers
export const getAllQuestions: Handler = async (ctx) => {
  try {
    const result = await catQAService.getAllQuestions(ctx.query.page, ctx.query.limit);
    return json(200, {
      success: true,
      data: result.questions,
      pagination: result.pagination,
      message: "Questions retrieved successfully",
    });
  } catch (error: any) {
    logger.error("Error fetching questions:", error);
    return json(500, { success: false, message: error.message || "Failed to fetch questions" });
  }
};

// Create a new question
export const createQuestion: Handler = async (ctx) => {
  try {
    const { question } = ctx.body;
    const userId = ctx.user?.id || null; // Get from auth middleware if available

    const questionResult = requiredText(question, "Question content", { max: 1000 });
    if (!questionResult.ok) return response.badRequest(questionResult.error);

    const newQuestion = await catQAService.createQuestion({
      question: questionResult.value,
      userId,
    });

    return json(201, {
      success: true,
      data: newQuestion,
      message: "Question created successfully",
    });
  } catch (error: any) {
    logger.error("Error creating question:", error);
    return json(500, { success: false, message: error.message || "Failed to create question" });
  }
};

// Get a specific question by ID
export const getQuestionById: Handler = async (ctx) => {
  try {
    const questionId = positiveInt(ctx.params.id, "Question ID");
    if (!questionId.ok) return response.badRequest(questionId.error);

    const question = await catQAService.getQuestionById(questionId.value);
    if (!canViewContent({ status: question.status, ownerId: question.userId, viewer: ctx.user })) {
      return response.notFound("Question not found");
    }

    return json(200, {
      success: true,
      data: question,
      message: "Question retrieved successfully",
    });
  } catch (error: any) {
    logger.error("Error fetching question:", error);
    return json(statusFor(error.message), { success: false, message: error.message || "Failed to fetch question" });
  }
};

// Add an answer to a question
export const addAnswer: Handler = async (ctx) => {
  try {
    const { answer } = ctx.body;
    const userId = ctx.user?.id || null; // Get from auth middleware if available

    const questionIdResult = positiveInt(ctx.params.id, "Question ID");
    if (!questionIdResult.ok) return response.badRequest(questionIdResult.error);
    const answerResult = requiredText(answer, "Answer content", { max: 2000 });
    if (!answerResult.ok) return response.badRequest(answerResult.error);

    const newAnswer = await catQAService.addAnswer({
      questionId: questionIdResult.value,
      answer: answerResult.value,
      userId,
    });

    return json(201, {
      success: true,
      data: newAnswer,
      message: "Answer added successfully",
    });
  } catch (error: any) {
    logger.error("Error adding answer:", error);
    return json(statusFor(error.message), { success: false, message: error.message || "Failed to add answer" });
  }
};

// Delete a question
export const deleteQuestion: Handler = async (ctx) => {
  try {
    const userId = ctx.user?.id || null;
    const questionId = positiveInt(ctx.params.id, "Question ID");
    if (!questionId.ok) return response.badRequest(questionId.error);

    const result = await catQAService.deleteQuestion(questionId.value, userId);

    return json(200, { success: true, message: result.message });
  } catch (error: any) {
    logger.error("Error deleting question:", error);
    return json(statusFor(error.message, ["Unauthorized", 403]), { success: false, message: error.message || "Failed to delete question" });
  }
};

// Delete an answer
export const deleteAnswer: Handler = async (ctx) => {
  try {
    const userId = ctx.user?.id || null;
    const id = positiveInt(ctx.params.answerId, "Answer ID");
    if (!id.ok) return response.badRequest(id.error);

    const result = await catQAService.deleteAnswer(id.value, userId);

    return json(200, { success: true, message: result.message });
  } catch (error: any) {
    logger.error("Error deleting answer:", error);
    return json(statusFor(error.message, ["Unauthorized", 403]), { success: false, message: error.message || "Failed to delete answer" });
  }
};
