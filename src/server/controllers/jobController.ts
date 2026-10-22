import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { json } from "../http/responses";
import jobService from "../services/jobService";
import logger from "../utils/logger";
import { canViewContent } from "../utils/contentVisibility";
import { optionalText, pagination, positiveInt, requiredText, sanitizePlainTextArray } from "../utils/validation";

const validJobTypes = ["Internship", "Job", "Research", "Project", "ClubRole", "Competition", "Freelance", "PartTime", "Volunteer"];

const normalizeJobType = (value: unknown) => {
  const text = String(value || "").trim();
  return validJobTypes.find((type) => type.toLowerCase() === text.toLowerCase()) || null;
};

const jobPayload = (body: Record<string, any>, { partial = false } = {}): { ok: true; payload: Record<string, any> } | { ok: false; error: string } => {
  const payload: Record<string, any> = {};

  if (!partial || body.title !== undefined) {
    const title = requiredText(body.title, "Title", { max: 160 });
    if (!title.ok) return { ok: false, error: title.error };
    payload.title = title.value;
  }

  if (!partial || body.type !== undefined) {
    const type = normalizeJobType(body.type);
    if (!type) return { ok: false, error: `Type must be one of: ${validJobTypes.join(", ")}` };
    payload.type = type;
  }

  if (!partial || body.description !== undefined) {
    const description = requiredText(body.description, "Description", { max: 5000 });
    if (!description.ok) return { ok: false, error: description.error };
    payload.description = description.value;
  }

  if (body.requirements !== undefined) {
    payload.requirements = Array.isArray(body.requirements)
      ? sanitizePlainTextArray(body.requirements, { max: 300 })
      : sanitizePlainTextArray(String(body.requirements).split("\n"), { max: 300 });
  }

  if (body.compensation !== undefined) {
    payload.compensation = optionalText(body.compensation, { max: 200 });
  }
  if (body.deadline !== undefined) payload.deadline = body.deadline || null;
  if (body.organization !== undefined) payload.organization = optionalText(body.organization, { max: 200 });
  if (body.format !== undefined) payload.format = optionalText(body.format, { max: 40 });
  if (body.department !== undefined) payload.department = optionalText(body.department, { max: 120 });
  if (body.skills !== undefined) payload.skills = Array.isArray(body.skills) ? sanitizePlainTextArray(body.skills, { max: 100 }) : sanitizePlainTextArray(String(body.skills).split(","), { max: 100 });
  // status is not owner-editable: DELETE soft-deletes, and archive/restore are
  // moderation decisions made through /api/reports.

  return { ok: true, payload };
};

export const createJob: Handler = async (ctx) => {
  try {
    const { userId } = ctx.user!;
    const parsed = jobPayload(ctx.body);
    if (!parsed.ok) return response.badRequest(parsed.error);

    const jobData = { ...parsed.payload, postedById: userId };
    const job = await jobService.createJob(jobData);
    return json(201, job);
  } catch (error: any) {
    logger.error("[JobController] Error creating job", error);
    return response.serverError("Error creating job", error.message);
  }
};

export const getAllJobs: Handler = async (ctx) => {
  try {
    const pageInfo = pagination(ctx.query.page, ctx.query.limit);
    const { jobs, pagination: paginationInfo } = await jobService.getAllJobs({
      ...pageInfo,
      type: optionalText(ctx.query.type, { max: 40 }),
      search: optionalText(ctx.query.search, { max: 200 }),
    });
    return response.success(jobs, null, { pagination: paginationInfo });
  } catch (error: any) {
    logger.error("[JobController] Error fetching jobs", error);
    return response.serverError("Error fetching jobs", error.message);
  }
};

export const getJobById: Handler = async (ctx) => {
  try {
    const id = positiveInt(ctx.params.id, "Job ID");
    if (!id.ok) return response.badRequest(id.error);

    const job = await jobService.getJobById(id.value);
    if (!job || !canViewContent({ status: job.status, ownerId: job.postedById, viewer: ctx.user })) {
      return response.notFound("Job not found");
    }
    return json(200, job);
  } catch (error: any) {
    logger.error("[JobController] Error fetching job", error);
    return response.serverError("Error fetching job", error.message);
  }
};

export const updateJob: Handler = async (ctx) => {
  try {
    const id = positiveInt(ctx.params.id, "Job ID");
    if (!id.ok) return response.badRequest(id.error);

    const parsed = jobPayload(ctx.body, { partial: true });
    if (!parsed.ok) return response.badRequest(parsed.error);

    const job = await jobService.updateJob(id.value, parsed.payload, ctx.user!.userId);
    return json(200, job);
  } catch (error: any) {
    logger.error("[JobController] Error updating job", error);
    if (error.message.includes("Unauthorized")) return response.forbidden(error.message);
    if (error.message.includes("not found")) return response.notFound(error.message);
    return response.serverError("Error updating job", error.message);
  }
};

export const deleteJob: Handler = async (ctx) => {
  try {
    const id = positiveInt(ctx.params.id, "Job ID");
    if (!id.ok) return response.badRequest(id.error);

    const job = await jobService.deleteJob(id.value, ctx.user!.userId, ctx.user!.role);
    return json(200, {
      success: true,
      message: "Job deleted successfully",
      data: job,
    });
  } catch (error: any) {
    logger.error("[JobController] Error deleting job", error);
    if (error.message.includes("Unauthorized")) return response.forbidden(error.message);
    if (error.message.includes("not found")) return response.notFound(error.message);
    return response.serverError("Error deleting job", error.message);
  }
};
