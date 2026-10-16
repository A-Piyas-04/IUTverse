const jobApplicationService = require("../services/jobApplicationService");
const logger = require("../utils/logger");
const response = require("../utils/responses");
const { pagination, positiveInt } = require("../utils/validation");

const applyToJob = async (req, res) => {
  try {
    const { userId } = req.user;
    const { jobId } = req.params;

    logger.debug("[JobApplicationController] Applying to job", {
      userId,
      jobId,
    });

    const application = await jobApplicationService.applyToJob(jobId, userId);

    logger.info("[JobApplicationController] Application created", { id: application.id });

    res.status(201).json({
      success: true,
      data: application,
      message: "Applied to job successfully",
    });
  } catch (error) {
    logger.error("[JobApplicationController] Error applying to job", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const removeApplication = async (req, res) => {
  try {
    const { userId } = req.user;
    const { jobId } = req.params;

    logger.debug("[JobApplicationController] Removing application", { userId, jobId });

    const result = await jobApplicationService.removeApplication(jobId, userId);

    logger.info("[JobApplicationController] Application removed", { userId, jobId });

    res.json({
      success: true,
      data: result,
      message: "Application removed successfully",
    });
  } catch (error) {
    logger.error("[JobApplicationController] Error removing application", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const id = positiveInt(jobId, "Job ID");
    if (id.error) return response.badRequest(res, id.error);
    const pageInfo = pagination(req.query.page, req.query.limit);

    logger.debug("[JobApplicationController] Fetching applications for job", { jobId });

    const result = await jobApplicationService.getJobApplications(
      id.value,
      req.user.userId,
      req.user.role,
      pageInfo
    );

    res.json({
      success: true,
      data: result.applications,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error("[JobApplicationController] Error fetching applications", error);
    if (error.message.includes("Unauthorized")) return response.forbidden(res, error.message);
    if (error.message.includes("not found")) return response.notFound(res, error.message);
    return response.serverError(res, "Error fetching applications", error.message);
  }
};

const getUserApplicationStatus = async (req, res) => {
  try {
    const { userId } = req.user;
    const { jobId } = req.params;

    logger.debug("[JobApplicationController] Checking application status", {
      userId,
      jobId,
    });

    const status = await jobApplicationService.getUserApplicationStatus(
      jobId,
      userId
    );

    logger.debug("[JobApplicationController] Application status fetched", { jobId, userId, hasApplied: status?.hasApplied });

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error("[JobApplicationController] Error checking application status", error);
    res.status(500).json({
      success: false,
      message: "Error checking application status",
      error: error.message,
    });
  }
};

const getApplicationCount = async (req, res) => {
  try {
    const { jobId } = req.params;

    const count = await jobApplicationService.getApplicationCount(jobId);

    res.json({
      success: true,
      data: count,
    });
  } catch (error) {
    logger.error("[JobApplicationController] Error fetching application count", error);
    res.status(500).json({
      success: false,
      message: "Error fetching application count",
      error: error.message,
    });
  }
};

module.exports = {
  applyToJob,
  removeApplication,
  getJobApplications,
  getUserApplicationStatus,
  getApplicationCount,
};
