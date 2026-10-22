import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { json } from "../http/responses";
import jobApplicationService from "../services/jobApplicationService";
import logger from "../utils/logger";
import { pagination, positiveInt } from "../utils/validation";

export const applyToJob: Handler = async (ctx) => {
  try {
    const { userId } = ctx.user!;
    const { id: jobId } = ctx.params;

    logger.debug("[JobApplicationController] Applying to job", {
      userId,
      jobId,
    });

    const application = await jobApplicationService.applyToJob(jobId, userId);

    logger.info("[JobApplicationController] Application created", { id: application.id });

    return json(201, {
      success: true,
      data: application,
      message: "Applied to job successfully",
    });
  } catch (error: any) {
    logger.error("[JobApplicationController] Error applying to job", error);
    return json(400, { success: false, message: error.message });
  }
};

export const removeApplication: Handler = async (ctx) => {
  try {
    const { userId } = ctx.user!;
    const { id: jobId } = ctx.params;

    logger.debug("[JobApplicationController] Removing application", { userId, jobId });

    const result = await jobApplicationService.removeApplication(jobId, userId);

    logger.info("[JobApplicationController] Application removed", { userId, jobId });

    return json(200, {
      success: true,
      data: result,
      message: "Application removed successfully",
    });
  } catch (error: any) {
    logger.error("[JobApplicationController] Error removing application", error);
    return json(400, { success: false, message: error.message });
  }
};

export const getJobApplications: Handler = async (ctx) => {
  try {
    const { id: jobId } = ctx.params;
    const id = positiveInt(jobId, "Job ID");
    if (!id.ok) return response.badRequest(id.error);
    const pageInfo = pagination(ctx.query.page, ctx.query.limit);

    logger.debug("[JobApplicationController] Fetching applications for job", { jobId });

    const result = await jobApplicationService.getJobApplications(
      id.value,
      ctx.user!.userId,
      ctx.user!.role,
      pageInfo
    );

    return json(200, {
      success: true,
      data: result.applications,
      pagination: result.pagination,
    });
  } catch (error: any) {
    logger.error("[JobApplicationController] Error fetching applications", error);
    if (error.message.includes("Unauthorized")) return response.forbidden(error.message);
    if (error.message.includes("not found")) return response.notFound(error.message);
    return response.serverError("Error fetching applications", error.message);
  }
};

export const getUserApplicationStatus: Handler = async (ctx) => {
  try {
    const { userId } = ctx.user!;
    const { id: jobId } = ctx.params;

    logger.debug("[JobApplicationController] Checking application status", {
      userId,
      jobId,
    });

    const status = await jobApplicationService.getUserApplicationStatus(jobId, userId);

    logger.debug("[JobApplicationController] Application status fetched", { jobId, userId, hasApplied: status?.hasApplied });

    return json(200, { success: true, data: status });
  } catch (error: any) {
    logger.error("[JobApplicationController] Error checking application status", error);
    return json(500, {
      success: false,
      message: "Error checking application status",
      error: error.message,
    });
  }
};

export const getApplicationCount: Handler = async (ctx) => {
  try {
    const { id: jobId } = ctx.params;

    const count = await jobApplicationService.getApplicationCount(jobId);

    return json(200, { success: true, data: count });
  } catch (error: any) {
    logger.error("[JobApplicationController] Error fetching application count", error);
    return json(500, {
      success: false,
      message: "Error fetching application count",
      error: error.message,
    });
  }
};
