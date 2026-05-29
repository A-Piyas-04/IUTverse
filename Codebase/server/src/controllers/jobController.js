const jobService = require('../services/jobService');
const response = require("../utils/responses");
const { enumValueExact, optionalText, positiveInt, requiredText, sanitizePlainTextArray } = require("../utils/validation");

const validJobTypes = ["Internship", "Freelance", "PartTime", "Volunteer"];

const normalizeJobType = (value) => {
  const text = String(value || "").trim();
  return validJobTypes.find((type) => type.toLowerCase() === text.toLowerCase()) || null;
};

const jobPayload = (body, { partial = false } = {}) => {
  const payload = {};

  if (!partial || body.title !== undefined) {
    const title = requiredText(body.title, "Title", { max: 160 });
    if (title.error) return { error: title.error };
    payload.title = title.value;
  }

  if (!partial || body.type !== undefined) {
    const type = normalizeJobType(body.type);
    if (!type) return { error: `Type must be one of: ${validJobTypes.join(", ")}` };
    payload.type = type;
  }

  if (!partial || body.description !== undefined) {
    const description = requiredText(body.description, "Description", { max: 5000 });
    if (description.error) return { error: description.error };
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
  if (body.status !== undefined && partial) {
    const status = enumValueExact(body.status, ["ACTIVE", "ARCHIVED", "DELETED"], "Status");
    payload.status = status.error ? String(body.status).toLowerCase() : status.value.toLowerCase();
  }

  return { payload };
};

const createJob = async (req, res) => {
  try {
    const { userId } = req.user;
    const parsed = jobPayload(req.body);
    if (parsed.error) return response.badRequest(res, parsed.error);

    const jobData = { ...parsed.payload, postedById: userId };
    const job = await jobService.createJob(jobData);
    res.status(201).json(job);
  } catch (error) {
    console.error('[JobController] Error creating job:', error);
    response.serverError(res, 'Error creating job', error.message);
  }
};

const getAllJobs = async (req, res) => {
  try {
    const jobs = await jobService.getAllJobs();
    res.json(jobs);
  } catch (error) {
    console.error('[JobController] Error fetching jobs:', error);
    response.serverError(res, 'Error fetching jobs', error.message);
  }
};

const getJobById = async (req, res) => {
  try {
    const id = positiveInt(req.params.id, "Job ID");
    if (id.error) return response.badRequest(res, id.error);

    const job = await jobService.getJobById(id.value);
    if (!job) return response.notFound(res, 'Job not found');
    res.json(job);
  } catch (error) {
    console.error('[JobController] Error fetching job:', error);
    response.serverError(res, 'Error fetching job', error.message);
  }
};

const updateJob = async (req, res) => {
  try {
    const id = positiveInt(req.params.id, "Job ID");
    if (id.error) return response.badRequest(res, id.error);

    const parsed = jobPayload(req.body, { partial: true });
    if (parsed.error) return response.badRequest(res, parsed.error);

    const job = await jobService.updateJob(id.value, parsed.payload, req.user.userId);
    res.json(job);
  } catch (error) {
    console.error('[JobController] Error updating job:', error);
    if (error.message.includes("Unauthorized")) return response.forbidden(res, error.message);
    if (error.message.includes("not found")) return response.notFound(res, error.message);
    response.serverError(res, 'Error updating job', error.message);
  }
};

module.exports = { createJob, getAllJobs, getJobById, updateJob }; 
