import type { Step } from "../http/context";
import { json } from "../http/responses";

// Validation steps for confession-related requests. These answer with the
// `{ message, error }` bodies the confession endpoints have always used.

const bad = (message: string, error: string, extras: Record<string, unknown> = {}) => json(400, { message, error, ...extras });

// Should match the tags the UI offers.
const validTags = [
  "Academic Stress",
  "Hall Life",
  "Wholesome",
  "Funny",
  "Relationship Drama",
  "Food Adventures",
  "Study Struggles",
  "Campus Life",
  "Personal Growth",
  "Random Thoughts",
];

export const validateConfessionData: Step = (ctx) => {
  const { content, tag, poll } = ctx.body;

  // Check required fields
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return bad("Content is required and must be a non-empty string", "Invalid content field");
  }

  if (!tag || typeof tag !== "string" || tag.trim().length === 0) {
    return bad("Tag is required and must be a non-empty string", "Invalid tag field");
  }

  // Content length validation
  if (content.length > 2000) {
    return bad("Content cannot exceed 2000 characters", "Content too long");
  }

  if (!validTags.includes(tag)) {
    return bad("Invalid tag", "Tag must be one of the predefined categories", { validTags });
  }

  // Poll validation (if provided)
  if (poll) {
    if (typeof poll !== "object" || !poll.question || !Array.isArray(poll.options)) {
      return bad("Poll must have a question and options array", "Invalid poll structure");
    }

    if (poll.question.length > 200) {
      return bad("Poll question cannot exceed 200 characters", "Poll question too long");
    }

    if (poll.options.length < 2 || poll.options.length > 5) {
      return bad("Poll must have between 2 and 5 options", "Invalid number of poll options");
    }

    // Validate each poll option
    for (let i = 0; i < poll.options.length; i++) {
      const option = poll.options[i];
      if (!option.text || typeof option.text !== "string" || option.text.trim().length === 0) {
        return bad(`Poll option ${i + 1} must have valid text`, "Invalid poll option");
      }

      if (option.text.length > 100) {
        return bad(`Poll option ${i + 1} cannot exceed 100 characters`, "Poll option too long");
      }
    }

    // Check for duplicate options
    const optionTexts = poll.options.map((opt: { text: string }) => opt.text.toLowerCase().trim());
    const uniqueTexts = new Set(optionTexts);
    if (optionTexts.length !== uniqueTexts.size) {
      return bad("Poll options must be unique", "Duplicate poll options found");
    }
  }
};

export const validateReactionData: Step = (ctx) => {
  const { reactionType } = ctx.body;

  if (!reactionType) {
    return bad("Reaction type is required", "Missing reactionType field");
  }

  const validReactions = ["like", "funny", "relatable", "angry", "insightful"];
  if (!validReactions.includes(reactionType)) {
    return bad("Invalid reaction type", "Reaction type must be one of the valid types", { validReactions });
  }
};

export const validatePollVoteData: Step = (ctx) => {
  const { optionId } = ctx.body;

  if (!optionId) {
    return bad("Option ID is required", "Missing optionId field");
  }

  if (!Number.isInteger(Number(optionId)) || Number(optionId) <= 0) {
    return bad("Option ID must be a positive integer", "Invalid optionId format");
  }
};

export const validatePaginationParams: Step = (ctx) => {
  const rawPage = ctx.query.page;
  const rawLimit = ctx.query.limit;

  // Set defaults
  const page = rawPage ? parseInt(String(rawPage)) : 1;
  const limit = rawLimit ? parseInt(String(rawLimit)) : 20;

  // Validate page
  if (!Number.isInteger(page) || page < 1) {
    return bad("Page must be a positive integer", "Invalid page parameter");
  }

  // Validate limit
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return bad("Limit must be between 1 and 100", "Invalid limit parameter");
  }

  // Validate sortBy
  const { sortBy } = ctx.query;
  if (sortBy) {
    const validSortOptions = ["recent", "mostReacted", "mostVoted"];
    if (!validSortOptions.includes(sortBy as string)) {
      return bad("Invalid sort option", "sortBy must be one of: recent, mostReacted, mostVoted", { validOptions: validSortOptions });
    }
  }

  // Validate tag filter
  const { tag } = ctx.query;
  if (tag && tag !== "all") {
    if (!validTags.includes(tag as string)) {
      return bad("Invalid tag filter", 'Tag must be one of the predefined categories or "all"', { validTags: ["all", ...validTags] });
    }
  }

  // Add validated params back to the request
  ctx.query.page = String(page);
  ctx.query.limit = String(limit);
};

export const validateIdParam: Step = (ctx) => {
  const { id } = ctx.params;

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return bad("Invalid ID parameter", "ID must be a positive integer");
  }
};

export const validatePollIdParam: Step = (ctx) => {
  const { pollId } = ctx.params;

  if (!Number.isInteger(Number(pollId)) || Number(pollId) <= 0) {
    return bad("Invalid poll ID parameter", "Poll ID must be a positive integer");
  }
};
