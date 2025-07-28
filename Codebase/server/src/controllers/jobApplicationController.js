const jobApplicationService = require("../services/jobApplicationService");

const applyToJob = async (req, res) => {
  try {
    const { userId } = req.user;
    const { jobId } = req.params;

    console.log("[JobApplicationController] Attempting to apply to job:", {
      userId,
      jobId,
    });

    const application = await jobApplicationService.applyToJob(jobId, userId);

    console.log(
      "[JobApplicationController] Application created successfully:",
      application.id
    );

    res.status(201).json({
      success: true,
      data: application,
      message: "Applied to job successfully",
    });
  } catch (error) {
    console.error("[JobApplicationController] Error applying to job:", error);
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

    console.log(
      "[JobApplicationController] Attempting to remove application:",
      {
        userId,
        jobId,
      }
    );

    const result = await jobApplicationService.removeApplication(jobId, userId);

    console.log("[JobApplicationController] Application removed successfully");

    res.json({
      success: true,
      data: result,
      message: "Application removed successfully",
    });
  } catch (error) {
    console.error(
      "[JobApplicationController] Error removing application:",
      error
    );
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;

    console.log(
      "[JobApplicationController] Fetching applications for job:",
      jobId
    );

    const applications = await jobApplicationService.getJobApplications(jobId);

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error(
      "[JobApplicationController] Error fetching applications:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Error fetching applications",
      error: error.message,
    });
  }
};

const getUserApplicationStatus = async (req, res) => {
  try {
    const { userId } = req.user;
    const { jobId } = req.params;

    console.log("[JobApplicationController] Checking application status for:", {
      userId,
      jobId,
    });

    const status = await jobApplicationService.getUserApplicationStatus(
      jobId,
      userId
    );

    console.log(
      "[JobApplicationController] Application status result:",
      status
    );

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error(
      "[JobApplicationController] Error checking application status:",
      error
    );
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
    console.error(
      "[JobApplicationController] Error fetching application count:",
      error
    );
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
