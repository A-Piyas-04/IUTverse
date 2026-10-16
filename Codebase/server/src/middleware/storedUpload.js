const uploadIntentService = require("../services/uploadIntentService");
const { optionalText } = require("../utils/validation");
const { failure } = require("../utils/responses");

// Lets a route accept either a multipart file (small files; multer runs first)
// or `uploadPath`, an object the client already put in Storage through
// POST /api/uploads. A valid claim becomes req.file, so controllers handle
// both the same way. Mount after authenticateToken and multer.
const acceptStoredUpload = (purpose, { nameField } = {}) => async (req, res, next) => {
  const reference = req.body?.uploadPath;
  if (reference === undefined || reference === null || reference === "") return next();
  if (req.file) return failure(res, 400, "Send either a file or an uploadPath, not both");

  try {
    req.file = await uploadIntentService.claimUpload({ userId: req.user.id, purpose, path: String(reference) });
    if (nameField) req.file.originalname = optionalText(req.body[nameField], { max: 200 }) || req.file.originalname;
    return next();
  } catch (error) {
    if (error?.isPublic) return failure(res, error.statusCode || 400, error.message);
    return next(error);
  }
};

module.exports = { acceptStoredUpload };
