import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { redirect } from "../http/responses";
import logger from "../utils/logger";
import { ensureSupabaseAdmin, pageRange, profileSelect, publicUrl } from "../utils/supabaseData";
import { canModerate } from "../middleware/authorization";
import { optionalText, positiveInt, requiredText } from "../utils/validation";
import config from "../config/config";
import { createTransporter } from "../config/email";
import * as storageService from "../services/storageService";
import * as securityService from "../services/securityService";
import * as sharedCache from "../services/sharedCache";
import { canViewContent } from "../utils/contentVisibility";

const ENTITY_TABLES: Record<string, string> = {
  post: "posts", comment: "post_comments", resource: "academic_resources", job: "jobs",
  lost_found: "lost_and_found_posts", confession: "confessions", cat_post: "cat_posts", event: "events",
};

const REPORT_STATUSES = ["pending", "reviewed", "dismissed"];
const REPORT_DECISIONS = ["approve", "archive", "dismiss"];

const safeEntity = (kind: string) => Object.prototype.hasOwnProperty.call(ENTITY_TABLES, kind);
const toPagination = (page: number, limit: number, total: number) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });

export const savedCreate: Handler = async (ctx) => {
  try {
    const { kind, id } = ctx.params;
    if (!safeEntity(kind) || !/^\d+$/.test(id)) return response.badRequest("Invalid saved item");
    const db = ensureSupabaseAdmin();
    const { data: exists, error: findError } = await db.from(ENTITY_TABLES[kind]).select("id").eq("id", Number(id)).maybeSingle();
    if (findError) throw findError;
    if (!exists) return response.notFound("Content not found");
    const { data, error } = await db.from("saved_items").upsert({ user_id: ctx.user!.id, entity_kind: kind, entity_id: Number(id) }).select().single();
    if (error) throw error;
    return response.created(data, "Saved");
  } catch (error: any) { logger.error("savedCreate failed", error); return response.serverError("Could not save item", error.message); }
};

export const savedDelete: Handler = async (ctx) => {
  try {
    const { kind, id } = ctx.params;
    if (!safeEntity(kind) || !/^\d+$/.test(id)) return response.badRequest("Invalid saved item");
    const { error } = await ensureSupabaseAdmin().from("saved_items").delete().eq("user_id", ctx.user!.id).eq("entity_kind", kind).eq("entity_id", Number(id));
    if (error) throw error;
    return response.success(null, "Removed from saved");
  } catch (error: any) { logger.error("savedDelete failed", error); return response.serverError("Could not remove saved item", error.message); }
};

export const savedStatus: Handler = async (ctx) => {
  try {
    const { kind, id } = ctx.params;
    if (!safeEntity(kind) || !/^\d+$/.test(id)) return response.badRequest("Invalid saved item");
    const { data, error } = await ensureSupabaseAdmin().from("saved_items").select("entity_id").eq("user_id", ctx.user!.id).eq("entity_kind", kind).eq("entity_id", Number(id)).maybeSingle();
    if (error) throw error;
    return response.success({ saved: Boolean(data) });
  } catch (error: any) { logger.error("savedStatus failed", error); return response.serverError("Could not check saved item", error.message); }
};

export const reportCreate: Handler = async (ctx) => {
  try {
    const { entityKind, reason, details } = ctx.body;
    const entityId = positiveInt(ctx.body.entityId, "Report target");
    if (!safeEntity(entityKind) || !entityId.ok) return response.badRequest("Invalid report target");
    const reasonValue = requiredText(reason, "Reason", { max: 120 });
    if (!reasonValue.ok) return response.badRequest(reasonValue.error);
    const db = ensureSupabaseAdmin();
    const { data: target, error: targetError } = await db.from(ENTITY_TABLES[entityKind]).select("id").eq("id", entityId.value).neq("status", "deleted").maybeSingle();
    if (targetError) throw targetError;
    if (!target) return response.notFound("Reported content not found");
    // ON CONFLICT DO NOTHING: resubmitting never re-opens a resolved report.
    const { data, error } = await db.from("content_reports").upsert({ reporter_id: ctx.user!.id, entity_kind: entityKind, entity_id: entityId.value, reason: reasonValue.value, details: optionalText(details, { max: 2000 }) }, { onConflict: "reporter_id,entity_kind,entity_id,reason", ignoreDuplicates: true }).select();
    if (error) throw error;
    if (!data?.length) return response.success(null, "You have already reported this content");
    return response.created(data[0], "Report submitted");
  } catch (error: any) { logger.error("reportCreate failed", error); return response.serverError("Could not submit report", error.message); }
};

export const reportsList: Handler = async (ctx) => {
  try {
    if (!canModerate(ctx.user)) return response.forbidden("Moderator access required");
    const status = ctx.query.status;
    if (status && !REPORT_STATUSES.includes(status as string)) return response.badRequest(`Status must be one of: ${REPORT_STATUSES.join(", ")}`);
    const { page, limit, from, to } = pageRange(ctx.query.page, ctx.query.limit);
    let query = ensureSupabaseAdmin().from("content_reports").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    if (status) query = query.eq("status", status as string);
    const { data, count, error } = await query;
    if (error) throw error;
    return response.success(data, null, { pagination: toPagination(page, limit, count || 0) });
  } catch (error: any) { logger.error("reportsList failed", error); return response.serverError("Could not load reports", error.message); }
};

// moderate_report raises with these SQLSTATEs; anything else is a server error.
const MODERATION_ERRORS: Record<string, number> = { "42501": 403, P0002: 404, "55000": 409, "22023": 400 };

export const reportUpdate: Handler = async (ctx) => {
  try {
    if (!canModerate(ctx.user)) return response.forbidden("Moderator access required");
    const reportId = positiveInt(ctx.params.id, "Report ID");
    if (!reportId.ok) return response.badRequest(reportId.error);
    // `action` is accepted from older clients; a separate `status` is ignored
    // because the decision alone determines both outcomes.
    const requested = ctx.body?.decision ?? ctx.body?.action;
    const decision = REPORT_DECISIONS.includes(requested) ? requested : null;
    if (!decision) return response.badRequest(`Decision must be one of: ${REPORT_DECISIONS.join(", ")}`);
    const data = await securityService.moderateReport({ actorId: ctx.user!.id, reportId: reportId.value, decision });
    return response.success(data, "Report reviewed");
  } catch (error: any) {
    const status = MODERATION_ERRORS[error?.code];
    if (status) return response.failure(status, error.message);
    logger.error("reportUpdate failed", error); return response.serverError("Could not update report", error.message);
  }
};

export const listEvents: Handler = async (ctx) => {
  try {
    const { page, limit, from, to } = pageRange(ctx.query.page, ctx.query.limit);
    let query = ensureSupabaseAdmin().from("events").select(`*, createdBy:profiles!events_created_by_id_fkey(${profileSelect})`, { count: "exact" }).eq("status", "active").eq("is_public", true).order("event_date").range(from, to);
    if (ctx.query.type && ctx.query.type !== "Wishlisted") query = query.eq("type", ctx.query.type as string);
    if (ctx.query.type === "Wishlisted") {
      if (!ctx.user?.id) return response.success([], null, { pagination: toPagination(page, limit, 0) });
      const { data: wishRows, error: wishError } = await ensureSupabaseAdmin().from("saved_items").select("entity_id").eq("user_id", ctx.user.id).eq("entity_kind", "event");
      if (wishError) throw wishError;
      const wishedIds = (wishRows || []).map((row) => row.entity_id);
      if (!wishedIds.length) return response.success([], null, { pagination: toPagination(page, limit, 0) });
      query = query.in("id", wishedIds);
    }
    const { data, count, error } = await query;
    if (error) throw error;
    let saved = new Set<number>(); let rsvps = new Map<number, string>();
    if (ctx.user?.id && data.length) {
      const ids = data.map((item: any) => item.id);
      const [{ data: saveRows }, { data: rsvpRows }] = await Promise.all([
        ensureSupabaseAdmin().from("saved_items").select("entity_id").eq("user_id", ctx.user.id).eq("entity_kind", "event").in("entity_id", ids),
        ensureSupabaseAdmin().from("event_rsvps").select("event_id,status").eq("user_id", ctx.user.id).in("event_id", ids),
      ]);
      saved = new Set((saveRows || []).map((row) => row.entity_id)); rsvps = new Map((rsvpRows || []).map((row) => [row.event_id, row.status]));
    }
    const mapped = data.map((item: any) => ({ id: item.id, title: item.title, description: item.description, location: item.location, eventDate: item.event_date, type: item.type, clubName: item.club_name, category: item.category, imageUrl: publicUrl(item.image_bucket, item.image_path), createdBy: item.createdBy, rsvpStatus: rsvps.get(item.id), saved: saved.has(item.id) }));
    return response.success(mapped, null, { pagination: toPagination(page, limit, count || 0) });
  } catch (error: any) { logger.error("listEvents failed", error); return response.serverError("Could not load events", error.message); }
};

export const createEvent: Handler = async (ctx) => {
  try {
    const title = requiredText(ctx.body.title, "Title", { max: 160 }); const description = requiredText(ctx.body.description, "Description", { max: 5000 }); const location = requiredText(ctx.body.location, "Location", { max: 200 });
    if (!title.ok) return response.badRequest(title.error);
    if (!description.ok) return response.badRequest(description.error);
    if (!location.ok) return response.badRequest(location.error);
    if (Number.isNaN(Date.parse(ctx.body.eventDate))) return response.badRequest("Valid event date is required");
    const image = ctx.file ? await storageService.uploadObject({ bucket: "event-images", userId: ctx.user!.id, file: ctx.file, prefix: "event" }) : null;
    const { data, error } = await ensureSupabaseAdmin().from("events").insert({ title: title.value, description: description.value, location: location.value, event_date: new Date(ctx.body.eventDate).toISOString(), type: optionalText(ctx.body.type, { max: 60 }) || "General", club_name: optionalText(ctx.body.clubName, { max: 160 }), category: optionalText(ctx.body.category, { max: 100 }), image_bucket: image?.bucket || null, image_path: image?.path || null, created_by_id: ctx.user!.id }).select().single();
    if (error) throw error;
    return response.created(data, "Event created");
  } catch (error: any) { logger.error("createEvent failed", error); return response.serverError("Could not create event", error.message); }
};

export const updateEvent: Handler = async (ctx) => {
  try {
    const db = ensureSupabaseAdmin(); const id = Number(ctx.params.id);
    const { data: existing, error: findError } = await db.from("events").select("created_by_id,image_bucket,image_path").eq("id", id).neq("status", "deleted").maybeSingle();
    if (findError) throw findError;
    if (!existing) return response.notFound("Event not found");
    if (existing.created_by_id !== ctx.user!.id && !canModerate(ctx.user)) return response.forbidden("Only the event owner can edit this event");
    const payload: Record<string, unknown> = {};
    for (const [input, column, max] of [["title", "title", 160], ["description", "description", 5000], ["location", "location", 200], ["type", "type", 60], ["clubName", "club_name", 160], ["category", "category", 100]] as const) if (ctx.body[input] !== undefined) payload[column] = optionalText(ctx.body[input], { max });
    if (ctx.body.eventDate !== undefined) { if (Number.isNaN(Date.parse(ctx.body.eventDate))) return response.badRequest("Valid event date is required"); payload.event_date = new Date(ctx.body.eventDate).toISOString(); }
    if (ctx.file) { const image = await storageService.uploadObject({ bucket: "event-images", userId: ctx.user!.id, file: ctx.file, prefix: "event" }); payload.image_bucket = image.bucket; payload.image_path = image.path; }
    const { data, error } = await db.from("events").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return response.success(data, "Event updated");
  } catch (error: any) { logger.error("updateEvent failed", error); return response.serverError("Could not update event", error.message); }
};

export const deleteEvent: Handler = async (ctx) => {
  try {
    const db = ensureSupabaseAdmin(); const id = Number(ctx.params.id);
    const { data: existing, error: findError } = await db.from("events").select("created_by_id").eq("id", id).neq("status", "deleted").maybeSingle();
    if (findError) throw findError;
    if (!existing) return response.notFound("Event not found");
    if (existing.created_by_id !== ctx.user!.id && !canModerate(ctx.user)) return response.forbidden("Only the event owner can delete this event");
    const { error } = await db.from("events").update({ status: "deleted" }).eq("id", id);
    if (error) throw error;
    return response.success(null, "Event deleted");
  } catch (error: any) { logger.error("deleteEvent failed", error); return response.serverError("Could not delete event", error.message); }
};

export const updateRsvp: Handler = async (ctx) => {
  try {
    const status = ["going", "interested", "not_going"].includes(ctx.body.status) ? ctx.body.status : null;
    if (!status) return response.badRequest("Invalid RSVP status");
    const db = ensureSupabaseAdmin();
    if (status === "not_going") { const { error } = await db.from("event_rsvps").delete().eq("event_id", Number(ctx.params.id)).eq("user_id", ctx.user!.id); if (error) throw error; return response.success(null, "RSVP removed"); }
    const { data, error } = await db.from("event_rsvps").upsert({ event_id: Number(ctx.params.id), user_id: ctx.user!.id, status }).select().single();
    if (error) throw error;
    return response.success(data, "RSVP updated");
  } catch (error: any) { logger.error("updateRsvp failed", error); return response.serverError("Could not update RSVP", error.message); }
};

export const toggleHelpful: Handler = async (ctx) => {
  try {
    const db = ensureSupabaseAdmin(); const resourceId = Number(ctx.params.id);
    const { data: existing, error: findError } = await db.from("academic_resource_feedback").select("resource_id").eq("resource_id", resourceId).eq("user_id", ctx.user!.id).maybeSingle();
    if (findError) throw findError;
    if (existing) await db.from("academic_resource_feedback").delete().eq("resource_id", resourceId).eq("user_id", ctx.user!.id); else await db.from("academic_resource_feedback").insert({ resource_id: resourceId, user_id: ctx.user!.id });
    const { count } = await db.from("academic_resource_feedback").select("resource_id", { count: "exact", head: true }).eq("resource_id", resourceId);
    await db.from("academic_resources").update({ helpful_count: count || 0 }).eq("id", resourceId);
    return response.success({ helpful: !existing, count: count || 0 });
  } catch (error: any) { logger.error("toggleHelpful failed", error); return response.serverError("Could not update feedback", error.message); }
};

export const resourceFile: Handler = async (ctx) => {
  try {
    const { data, error } = await ensureSupabaseAdmin().from("academic_resources").select("file_bucket,file_path,status,uploaded_by_id").eq("id", Number(ctx.params.id)).maybeSingle();
    if (error) throw error;
    if (!data?.file_path || !canViewContent({ status: data.status, ownerId: data.uploaded_by_id, viewer: ctx.user })) return response.notFound("Resource file not found");
    return redirect((await storageService.signedUrl(data.file_bucket, data.file_path, 300)) as string);
  } catch (error: any) { logger.error("resourceFile failed", error); return response.serverError("Could not open resource", error.message); }
};

const WEATHER_CACHE_KEY = "cache:campus-weather";
export const weather: Handler = async () => {
  try {
    const cached = await sharedCache.get(WEATHER_CACHE_KEY);
    if (cached) return response.success(cached);
    if (!process.env.OPENWEATHER_API_KEY) return response.failure(503, "Weather service is not configured");
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=23.9981&lon=90.423&appid=${encodeURIComponent(process.env.OPENWEATHER_API_KEY)}&units=metric`;
    const result = await fetch(url); if (!result.ok) throw new Error(`Weather provider returned ${result.status}`); const data = await result.json();
    const value = { location: `${data.name || "Gazipur"}, ${data.sys?.country || "BD"}`, temperature: data.main?.temp, feelsLike: data.main?.feels_like, humidity: data.main?.humidity, windSpeed: data.wind?.speed, description: data.weather?.[0]?.description || "Weather unavailable" };
    await sharedCache.set(WEATHER_CACHE_KEY, value, 10 * 60);
    return response.success(value);
  } catch (error) { logger.error("weather proxy failed", error); return response.failure(502, "Weather data is temporarily unavailable"); }
};

export const createIssueReport: Handler = async (ctx) => {
  try {
    const name = requiredText(ctx.body.name, "Name", { max: 120 }); const email = requiredText(ctx.body.email, "Email", { max: 254 }); const issueType = requiredText(ctx.body.issueType, "Issue type", { max: 80 }); const description = requiredText(ctx.body.description, "Description", { max: 5000 });
    if (!name.ok) return response.badRequest(name.error);
    if (!email.ok) return response.badRequest(email.error);
    if (!issueType.ok) return response.badRequest(issueType.error);
    if (!description.ok) return response.badRequest(description.error);
    if (!/^\S+@\S+\.\S+$/.test(email.value)) return response.badRequest("Valid email is required");
    const { data, error } = await ensureSupabaseAdmin().from("issue_reports").insert({ reporter_id: ctx.user?.id || null, name: name.value, email: email.value, issue_type: issueType.value, description: description.value }).select().single(); if (error) throw error;
    if (config.email.user && config.email.pass) createTransporter().sendMail({ from: config.email.user, to: process.env.SUPPORT_EMAIL || config.email.user, replyTo: email.value, subject: `[IUTverse] ${issueType.value} report #${data.id}`, text: `${name.value} (${email.value})\n\n${description.value}` }).catch((mailError) => logger.error("issue report email failed", mailError));
    return response.created(data, "Issue report submitted");
  } catch (error: any) { logger.error("createIssueReport failed", error); return response.serverError("Could not submit issue report", error.message); }
};
