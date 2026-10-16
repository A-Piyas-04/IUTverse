// Validation middleware for confession-related requests

const validateConfessionData = (req, res, next) => {
  const { content, tag, poll } = req.body;

  // Check required fields
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return res.status(400).json({
      message: "Content is required and must be a non-empty string",
      error: "Invalid content field",
    });
  }

  if (!tag || typeof tag !== "string" || tag.trim().length === 0) {
    return res.status(400).json({
      message: "Tag is required and must be a non-empty string",
      error: "Invalid tag field",
    });
  }

  // Content length validation
  if (content.length > 2000) {
    return res.status(400).json({
      message: "Content cannot exceed 2000 characters",
      error: "Content too long",
    });
  }

  // Valid tags (should match frontend TAGS array)
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

  if (!validTags.includes(tag)) {
    return res.status(400).json({
      message: "Invalid tag",
      error: "Tag must be one of the predefined categories",
      validTags,
    });
  }

  // Poll validation (if provided)
  if (poll) {
    if (
      typeof poll !== "object" ||
      !poll.question ||
      !Array.isArray(poll.options)
    ) {
      return res.status(400).json({
        message: "Poll must have a question and options array",
        error: "Invalid poll structure",
      });
    }

    if (poll.question.length > 200) {
      return res.status(400).json({
        message: "Poll question cannot exceed 200 characters",
        error: "Poll question too long",
      });
    }

    if (poll.options.length < 2 || poll.options.length > 5) {
      return res.status(400).json({
        message: "Poll must have between 2 and 5 options",
        error: "Invalid number of poll options",
      });
    }

    // Validate each poll option
    for (let i = 0; i < poll.options.length; i++) {
      const option = poll.options[i];
      if (
        !option.text ||
        typeof option.text !== "string" ||
        option.text.trim().length === 0
      ) {
        return res.status(400).json({
          message: `Poll option ${i + 1} must have valid text`,
          error: "Invalid poll option",
        });
      }

      if (option.text.length > 100) {
        return res.status(400).json({
          message: `Poll option ${i + 1} cannot exceed 100 characters`,
          error: "Poll option too long",
        });
      }
    }

    // Check for duplicate options
    const optionTexts = poll.options.map((opt) =>
      opt.text.toLowerCase().trim()
    );
    const uniqueTexts = new Set(optionTexts);
    if (optionTexts.length !== uniqueTexts.size) {
      return res.status(400).json({
        message: "Poll options must be unique",
        error: "Duplicate poll options found",
      });
    }
  }

  next();
};

const validateReactionData = (req, res, next) => {
  const { reactionType } = req.body;

  if (!reactionType) {
    return res.status(400).json({
      message: "Reaction type is required",
      error: "Missing reactionType field",
    });
  }

  const validReactions = ["like", "funny", "relatable", "angry", "insightful"];
  if (!validReactions.includes(reactionType)) {
    return res.status(400).json({
      message: "Invalid reaction type",
      error: "Reaction type must be one of the valid types",
      validReactions,
    });
  }

  next();
};

const validatePollVoteData = (req, res, next) => {
  const { optionId } = req.body;

  if (!optionId) {
    return res.status(400).json({
      message: "Option ID is required",
      error: "Missing optionId field",
    });
  }

  if (!Number.isInteger(Number(optionId)) || Number(optionId) <= 0) {
    return res.status(400).json({
      message: "Option ID must be a positive integer",
      error: "Invalid optionId format",
    });
  }

  next();
};

const validatePaginationParams = (req, res, next) => {
  let { page, limit } = req.query;

  // Set defaults
  page = page ? parseInt(page) : 1;
  limit = limit ? parseInt(limit) : 20;

  // Validate page
  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).json({
      message: "Page must be a positive integer",
      error: "Invalid page parameter",
    });
  }

  // Validate limit
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      message: "Limit must be between 1 and 100",
      error: "Invalid limit parameter",
    });
  }

  // Validate sortBy
  const { sortBy } = req.query;
  if (sortBy) {
    const validSortOptions = ["recent", "mostReacted", "mostVoted"];
    if (!validSortOptions.includes(sortBy)) {
      return res.status(400).json({
        message: "Invalid sort option",
        error: "sortBy must be one of: recent, mostReacted, mostVoted",
        validOptions: validSortOptions,
      });
    }
  }

  // Validate tag filter
  const { tag } = req.query;
  if (tag && tag !== "all") {
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

    if (!validTags.includes(tag)) {
      return res.status(400).json({
        message: "Invalid tag filter",
        error: 'Tag must be one of the predefined categories or "all"',
        validTags: ["all", ...validTags],
      });
    }
  }

  // Add validated params back to request
  req.query.page = page;
  req.query.limit = limit;

  next();
};

const validateIdParam = (req, res, next) => {
  const { id } = req.params;

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({
      message: "Invalid ID parameter",
      error: "ID must be a positive integer",
    });
  }

  next();
};

const validatePollIdParam = (req, res, next) => {
  const { pollId } = req.params;

  if (!Number.isInteger(Number(pollId)) || Number(pollId) <= 0) {
    return res.status(400).json({
      message: "Invalid poll ID parameter",
      error: "Poll ID must be a positive integer",
    });
  }

  next();
};

module.exports = {
  validateConfessionData,
  validateReactionData,
  validatePollVoteData,
  validatePaginationParams,
  validateIdParam,
  validatePollIdParam,
};
