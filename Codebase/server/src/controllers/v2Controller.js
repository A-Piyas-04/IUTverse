const { ensureSupabaseAdmin, pageRange, profileSelect, publicUrl } = require("../utils/supabaseData");
const response = require("../utils/responses");
const logger = require("../utils/logger");
const { canModerate } = require("../middleware/authorization");
const { optionalText, requiredText } = require("../utils/validation");
const config = require("../config/config");
const { createTransporter } = require("../config/email");
const storageService = require("../services/storageService");

const ENTITY_TABLES = {
  post: "posts", comment: "post_comments", resource: "academic_resources", job: "jobs",
  lost_found: "lost_and_found_posts", confession: "confessions", cat_post: "cat_posts", event: "events",
};

const safeEntity = (kind) => Object.prototype.hasOwnProperty.call(ENTITY_TABLES, kind);
const toPagination = (page, limit, total) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });

const savedCreate = async (req, res) => {
  try {
    const { kind, id } = req.params;
    if (!safeEntity(kind) || !/^\d+$/.test(id)) return response.badRequest(res, "Invalid saved item");
    const db = ensureSupabaseAdmin();
    const { data: exists, error: findError } = await db.from(ENTITY_TABLES[kind]).select("id").eq("id", Number(id)).maybeSingle();
    if (findError) throw findError;
    if (!exists) return response.notFound(res, "Content not found");
    const { data, error } = await db.from("saved_items").upsert({ user_id: req.user.id, entity_kind: kind, entity_id: Number(id) }).select().single();
    if (error) throw error;
    return response.created(res, data, "Saved");
  } catch (error) { logger.error("savedCreate failed", error); return response.serverError(res, "Could not save item", error.message); }
};

const savedDelete = async (req, res) => {
  try {
    const { kind, id } = req.params;
    if (!safeEntity(kind) || !/^\d+$/.test(id)) return response.badRequest(res, "Invalid saved item");
    const { error } = await ensureSupabaseAdmin().from("saved_items").delete().eq("user_id", req.user.id).eq("entity_kind", kind).eq("entity_id", Number(id));
    if (error) throw error;
    return response.success(res, null, "Removed from saved");
  } catch (error) { logger.error("savedDelete failed", error); return response.serverError(res, "Could not remove saved item", error.message); }
};

const savedStatus = async (req, res) => {
  try {
    const { kind, id } = req.params;
    if (!safeEntity(kind) || !/^\d+$/.test(id)) return response.badRequest(res, "Invalid saved item");
    const { data, error } = await ensureSupabaseAdmin().from("saved_items").select("entity_id").eq("user_id", req.user.id).eq("entity_kind", kind).eq("entity_id", Number(id)).maybeSingle();
    if (error) throw error;
    return response.success(res, { saved: Boolean(data) });
  } catch (error) { logger.error("savedStatus failed", error); return response.serverError(res, "Could not check saved item", error.message); }
};

const reportCreate = async (req, res) => {
  try {
    const { entityKind, entityId, reason, details } = req.body;
    if (!safeEntity(entityKind) || !Number.isInteger(Number(entityId))) return response.badRequest(res, "Invalid report target");
    const reasonValue = requiredText(reason, "Reason", { max: 120 });
    if (reasonValue.error) return response.badRequest(res, reasonValue.error);
    const { data, error } = await ensureSupabaseAdmin().from("content_reports").upsert({ reporter_id: req.user.id, entity_kind: entityKind, entity_id: Number(entityId), reason: reasonValue.value, details: optionalText(details, { max: 2000 }), status: "pending" }, { onConflict: "reporter_id,entity_kind,entity_id,reason" }).select().single();
    if (error) throw error;
    return response.created(res, data, "Report submitted");
  } catch (error) { logger.error("reportCreate failed", error); return response.serverError(res, "Could not submit report", error.message); }
};

const reportsList = async (req, res) => {
  try {
    if (!canModerate(req.user)) return response.forbidden(res, "Moderator access required");
    const { page, limit, from, to } = pageRange(req.query.page, req.query.limit);
    let query = ensureSupabaseAdmin().from("content_reports").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    if (req.query.status) query = query.eq("status", req.query.status);
    const { data, count, error } = await query;
    if (error) throw error;
    return response.success(res, data, null, { pagination: toPagination(page, limit, count || 0) });
  } catch (error) { logger.error("reportsList failed", error); return response.serverError(res, "Could not load reports", error.message); }
};

const reportUpdate = async (req, res) => {
  try {
    if (!canModerate(req.user)) return response.forbidden(res, "Moderator access required");
    const status = ["reviewed", "dismissed"].includes(req.body.status) ? req.body.status : null;
    if (!status) return response.badRequest(res, "Invalid report status");
    const { data, error } = await ensureSupabaseAdmin().from("content_reports").update({ status, reviewed_by_id: req.user.id, review_action: optionalText(req.body.action, { max: 80 }), reviewed_at: new Date().toISOString() }).eq("id", Number(req.params.id)).select().maybeSingle();
    if (error) throw error;
    if (!data) return response.notFound(res, "Report not found");
    if (req.body.action === "archive" && safeEntity(data.entity_kind)) await ensureSupabaseAdmin().from(ENTITY_TABLES[data.entity_kind]).update({ status: "archived" }).eq("id", data.entity_id);
    if (req.body.action === "approve" && safeEntity(data.entity_kind)) await ensureSupabaseAdmin().from(ENTITY_TABLES[data.entity_kind]).update({ status: "active" }).eq("id", data.entity_id);
    return response.success(res, data, "Report reviewed");
  } catch (error) { logger.error("reportUpdate failed", error); return response.serverError(res, "Could not update report", error.message); }
};

const listEvents = async (req, res) => {
  try {
    const { page, limit, from, to } = pageRange(req.query.page, req.query.limit);
    let query = ensureSupabaseAdmin().from("events").select(`*, createdBy:profiles!events_created_by_id_fkey(${profileSelect})`, { count: "exact" }).neq("status", "deleted").order("event_date").range(from, to);
    if (req.query.type && req.query.type !== "Wishlisted") query = query.eq("type", req.query.type);
    if (req.query.type === "Wishlisted") {
      if (!req.user?.id) return response.success(res, [], null, { pagination: toPagination(page, limit, 0) });
      const { data: wishRows, error: wishError } = await ensureSupabaseAdmin().from("saved_items").select("entity_id").eq("user_id", req.user.id).eq("entity_kind", "event");
      if (wishError) throw wishError;
      const wishedIds = (wishRows || []).map(row => row.entity_id);
      if (!wishedIds.length) return response.success(res, [], null, { pagination: toPagination(page, limit, 0) });
      query = query.in("id", wishedIds);
    }
    const { data, count, error } = await query;
    if (error) throw error;
    let saved = new Set(); let rsvps = new Map();
    if (req.user?.id && data.length) {
      const ids = data.map(item => item.id);
      const [{ data: saveRows }, { data: rsvpRows }] = await Promise.all([
        ensureSupabaseAdmin().from("saved_items").select("entity_id").eq("user_id", req.user.id).eq("entity_kind", "event").in("entity_id", ids),
        ensureSupabaseAdmin().from("event_rsvps").select("event_id,status").eq("user_id", req.user.id).in("event_id", ids),
      ]);
      saved = new Set((saveRows || []).map(row => row.entity_id)); rsvps = new Map((rsvpRows || []).map(row => [row.event_id, row.status]));
    }
    const mapped = data.map(item => ({ id: item.id, title: item.title, description: item.description, location: item.location, eventDate: item.event_date, type: item.type, clubName: item.club_name, category: item.category, imageUrl: publicUrl(item.image_bucket, item.image_path), createdBy: item.createdBy, rsvpStatus: rsvps.get(item.id), saved: saved.has(item.id) }));
    return response.success(res, mapped, null, { pagination: toPagination(page, limit, count || 0) });
  } catch (error) { logger.error("listEvents failed", error); return response.serverError(res, "Could not load events", error.message); }
};

const createEvent = async (req, res) => {
  try {
    const title = requiredText(req.body.title, "Title", { max: 160 }); const description = requiredText(req.body.description, "Description", { max: 5000 }); const location = requiredText(req.body.location, "Location", { max: 200 });
    if (title.error || description.error || location.error || Number.isNaN(Date.parse(req.body.eventDate))) return response.badRequest(res, title.error || description.error || location.error || "Valid event date is required");
    const image = req.file ? await storageService.uploadObject({ bucket: "event-images", userId: req.user.id, file: req.file, prefix: "event" }) : {};
    const { data, error } = await ensureSupabaseAdmin().from("events").insert({ title: title.value, description: description.value, location: location.value, event_date: new Date(req.body.eventDate).toISOString(), type: optionalText(req.body.type, { max: 60 }) || "General", club_name: optionalText(req.body.clubName, { max: 160 }), category: optionalText(req.body.category, { max: 100 }), image_bucket: image.bucket || null, image_path: image.path || null, created_by_id: req.user.id }).select().single();
    if (error) throw error;
    return response.created(res, data, "Event created");
  } catch (error) { logger.error("createEvent failed", error); return response.serverError(res, "Could not create event", error.message); }
};

const updateEvent = async (req, res) => {
  try {
    const db = ensureSupabaseAdmin(); const id = Number(req.params.id);
    const { data: existing, error: findError } = await db.from("events").select("created_by_id,image_bucket,image_path").eq("id", id).neq("status", "deleted").maybeSingle();
    if (findError) throw findError;
    if (!existing) return response.notFound(res, "Event not found");
    if (existing.created_by_id !== req.user.id && !canModerate(req.user)) return response.forbidden(res, "Only the event owner can edit this event");
    const payload = {};
    for (const [input, column, max] of [["title", "title", 160], ["description", "description", 5000], ["location", "location", 200], ["type", "type", 60], ["clubName", "club_name", 160], ["category", "category", 100]]) if (req.body[input] !== undefined) payload[column] = optionalText(req.body[input], { max });
    if (req.body.eventDate !== undefined) { if (Number.isNaN(Date.parse(req.body.eventDate))) return response.badRequest(res, "Valid event date is required"); payload.event_date = new Date(req.body.eventDate).toISOString(); }
    if (req.file) { const image = await storageService.uploadObject({ bucket: "event-images", userId: req.user.id, file: req.file, prefix: "event" }); payload.image_bucket = image.bucket; payload.image_path = image.path; }
    const { data, error } = await db.from("events").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return response.success(res, data, "Event updated");
  } catch (error) { logger.error("updateEvent failed", error); return response.serverError(res, "Could not update event", error.message); }
};

const deleteEvent = async (req, res) => {
  try {
    const db = ensureSupabaseAdmin(); const id = Number(req.params.id);
    const { data: existing, error: findError } = await db.from("events").select("created_by_id").eq("id", id).neq("status", "deleted").maybeSingle();
    if (findError) throw findError;
    if (!existing) return response.notFound(res, "Event not found");
    if (existing.created_by_id !== req.user.id && !canModerate(req.user)) return response.forbidden(res, "Only the event owner can delete this event");
    const { error } = await db.from("events").update({ status: "deleted" }).eq("id", id);
    if (error) throw error;
    return response.success(res, null, "Event deleted");
  } catch (error) { logger.error("deleteEvent failed", error); return response.serverError(res, "Could not delete event", error.message); }
};

const updateRsvp = async (req, res) => {
  try {
    const status = ["going", "interested", "not_going"].includes(req.body.status) ? req.body.status : null;
    if (!status) return response.badRequest(res, "Invalid RSVP status");
    const db = ensureSupabaseAdmin();
    if (status === "not_going") { const { error } = await db.from("event_rsvps").delete().eq("event_id", Number(req.params.id)).eq("user_id", req.user.id); if (error) throw error; return response.success(res, null, "RSVP removed"); }
    const { data, error } = await db.from("event_rsvps").upsert({ event_id: Number(req.params.id), user_id: req.user.id, status }).select().single();
    if (error) throw error;
    return response.success(res, data, "RSVP updated");
  } catch (error) { logger.error("updateRsvp failed", error); return response.serverError(res, "Could not update RSVP", error.message); }
};

const toggleHelpful = async (req, res) => {
  try {
    const db = ensureSupabaseAdmin(); const resourceId = Number(req.params.id);
    const { data: existing, error: findError } = await db.from("academic_resource_feedback").select("resource_id").eq("resource_id", resourceId).eq("user_id", req.user.id).maybeSingle();
    if (findError) throw findError;
    if (existing) await db.from("academic_resource_feedback").delete().eq("resource_id", resourceId).eq("user_id", req.user.id); else await db.from("academic_resource_feedback").insert({ resource_id: resourceId, user_id: req.user.id });
    const { count } = await db.from("academic_resource_feedback").select("resource_id", { count: "exact", head: true }).eq("resource_id", resourceId);
    await db.from("academic_resources").update({ helpful_count: count || 0 }).eq("id", resourceId);
    return response.success(res, { helpful: !existing, count: count || 0 });
  } catch (error) { logger.error("toggleHelpful failed", error); return response.serverError(res, "Could not update feedback", error.message); }
};

const resourceFile = async (req, res) => {
  try {
    const { data, error } = await ensureSupabaseAdmin().from("academic_resources").select("file_bucket,file_path").eq("id", Number(req.params.id)).neq("status", "deleted").maybeSingle();
    if (error) throw error;
    if (!data?.file_path) return response.notFound(res, "Resource file not found");
    return res.redirect(await storageService.signedUrl(data.file_bucket, data.file_path, 300));
  } catch (error) { logger.error("resourceFile failed", error); return response.serverError(res, "Could not open resource", error.message); }
};

let weatherCache = { expires: 0, value: null };
const weather = async (_req, res) => {
  try {
    if (weatherCache.value && weatherCache.expires > Date.now()) return response.success(res, weatherCache.value);
    if (!process.env.OPENWEATHER_API_KEY) return response.failure(res, 503, "Weather service is not configured");
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=23.9981&lon=90.423&appid=${encodeURIComponent(process.env.OPENWEATHER_API_KEY)}&units=metric`;
    const result = await fetch(url); if (!result.ok) throw new Error(`Weather provider returned ${result.status}`); const data = await result.json();
    weatherCache = { expires: Date.now() + 10 * 60 * 1000, value: { location: `${data.name || "Gazipur"}, ${data.sys?.country || "BD"}`, temperature: data.main?.temp, feelsLike: data.main?.feels_like, humidity: data.main?.humidity, windSpeed: data.wind?.speed, description: data.weather?.[0]?.description || "Weather unavailable" } };
    return response.success(res, weatherCache.value);
  } catch (error) { logger.error("weather proxy failed", error); return response.failure(res, 502, "Weather data is temporarily unavailable"); }
};

const createIssueReport = async (req, res) => {
  try {
    const name = requiredText(req.body.name, "Name", { max: 120 }); const email = requiredText(req.body.email, "Email", { max: 254 }); const issueType = requiredText(req.body.issueType, "Issue type", { max: 80 }); const description = requiredText(req.body.description, "Description", { max: 5000 });
    if (name.error || email.error || issueType.error || description.error || !/^\S+@\S+\.\S+$/.test(email.value || "")) return response.badRequest(res, name.error || email.error || issueType.error || description.error || "Valid email is required");
    const { data, error } = await ensureSupabaseAdmin().from("issue_reports").insert({ reporter_id: req.user?.id || null, name: name.value, email: email.value, issue_type: issueType.value, description: description.value }).select().single(); if (error) throw error;
    if (config.email.user && config.email.pass) createTransporter().sendMail({ from: config.email.user, to: process.env.SUPPORT_EMAIL || config.email.user, replyTo: email.value, subject: `[IUTverse] ${issueType.value} report #${data.id}`, text: `${name.value} (${email.value})\n\n${description.value}` }).catch(mailError => logger.error("issue report email failed", mailError));
    return response.created(res, data, "Issue report submitted");
  } catch (error) { logger.error("createIssueReport failed", error); return response.serverError(res, "Could not submit issue report", error.message); }
};

module.exports = { savedCreate, savedDelete, savedStatus, reportCreate, reportsList, reportUpdate, listEvents, createEvent, updateEvent, deleteEvent, updateRsvp, toggleHelpful, resourceFile, weather, createIssueReport };
