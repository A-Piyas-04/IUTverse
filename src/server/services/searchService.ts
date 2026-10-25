// Site-wide search (the navbar box and /search), Facebook-style: one query,
// results grouped by kind. Each kind applies the same visibility rule as its
// own list: active content only, and anonymous posts never reveal the author.
import "server-only";
import { PublicError } from "../http/errors";
import { ensureSupabaseAdmin, mapProfile, profileSelect, publicUrl } from "../utils/supabaseData";
import { filterSearchTerm, sanitizePlainText } from "../utils/validation";

export const SEARCH_TYPES = ["people", "posts", "events", "jobs", "resources", "lostFound"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

/** Results per kind on the "All" view; a single kind pages through more. */
const PREVIEW_LIMIT = 4;
const PAGE_LIMIT = 20;

// Text for an or=(...) filter: PostgREST syntax and LIKE wildcards are dropped.
export const searchPattern = (query: string) => {
  const term = filterSearchTerm(query).replace(/[%_*]/g, " ").replace(/\s+/g, " ").trim();
  return term ? `*${term}*` : "";
};

const snippet = (text: unknown, max = 160) => sanitizePlainText(text, { max });

type Range = { from: number; to: number };

const people = async (pattern: string, { from, to }: Range) => {
  const { data, error } = await ensureSupabaseAdmin()
    .from("profiles")
    .select(profileSelect)
    .or(`display_name.ilike.${pattern},handle.ilike.${pattern}`)
    .order("display_name")
    .range(from, to);
  if (error) throw error;
  return ((data as any[]) || []).map(mapProfile);
};

const posts = async (pattern: string, { from, to }: Range) => {
  const { data, error } = await ensureSupabaseAdmin()
    .from("posts")
    .select(`id, content, is_anonymous, image_bucket, image_path, reaction_count, comment_count, created_at, user:profiles!posts_author_id_fkey(${profileSelect})`)
    .eq("status", "active")
    .ilike("content", pattern.replaceAll("*", "%"))
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return ((data as any[]) || []).map((post) => ({
    id: post.id,
    content: snippet(post.content, 220),
    isAnonymous: Boolean(post.is_anonymous),
    author: post.is_anonymous ? null : mapProfile(post.user),
    imageUrl: publicUrl(post.image_bucket, post.image_path),
    reactionCount: post.reaction_count || 0,
    commentCount: post.comment_count || 0,
    createdAt: post.created_at,
  }));
};

const events = async (pattern: string, { from, to }: Range) => {
  const { data, error } = await ensureSupabaseAdmin()
    .from("events")
    .select("id, title, description, location, event_date")
    .eq("status", "active")
    .or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`)
    .order("event_date", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return ((data as any[]) || []).map((event) => ({ id: event.id, title: event.title, description: snippet(event.description), location: event.location, eventDate: event.event_date }));
};

const jobs = async (pattern: string, { from, to }: Range) => {
  const { data, error } = await ensureSupabaseAdmin()
    .from("jobs")
    .select("id, title, type, organization, description, created_at")
    .eq("status", "active")
    .or(`title.ilike.${pattern},description.ilike.${pattern},organization.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return ((data as any[]) || []).map((job) => ({ id: job.id, title: job.title, type: job.type, organization: job.organization, description: snippet(job.description), createdAt: job.created_at }));
};

const resources = async (pattern: string, { from, to }: Range) => {
  const { data, error } = await ensureSupabaseAdmin()
    .from("academic_resources")
    .select("id, title, type, course_code, description, created_at")
    .eq("status", "active")
    .or(`title.ilike.${pattern},description.ilike.${pattern},course_code.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return ((data as any[]) || []).map((resource) => ({ id: resource.id, title: resource.title, type: resource.type, courseCode: resource.course_code, description: snippet(resource.description), createdAt: resource.created_at }));
};

// Lost & found lists resolved items too; contact details are never included.
const lostFound = async (pattern: string, { from, to }: Range) => {
  const { data, error } = await ensureSupabaseAdmin()
    .from("lost_and_found_posts")
    .select("id, type, title, description, location, status, created_at")
    .in("status", ["active", "resolved"])
    .or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return ((data as any[]) || []).map((item) => ({ id: item.id, type: item.type, title: item.title, description: snippet(item.description), location: item.location, status: item.status, createdAt: item.created_at }));
};

const searchers: Record<SearchType, (pattern: string, range: Range) => Promise<unknown[]>> = { people, posts, events, jobs, resources, lostFound };

/** Everything matching the query: a few of each kind, or one kind page by page. */
export async function searchEverything(query: string, type: SearchType | "all" = "all", page = 1) {
  const pattern = searchPattern(query);
  if (pattern.length < 4) throw new PublicError("Type at least two characters to search");
  if (type === "all") {
    const range = { from: 0, to: PREVIEW_LIMIT };
    const entries = await Promise.all(SEARCH_TYPES.map(async (kind) => [kind, await searchers[kind](pattern, range)] as const));
    // One extra was fetched per kind to know whether "See all" has more to show.
    return {
      query,
      type,
      groups: Object.fromEntries(entries.map(([kind, items]) => [kind, { items: items.slice(0, PREVIEW_LIMIT), hasMore: items.length > PREVIEW_LIMIT }])),
    };
  }
  const from = (Math.max(page, 1) - 1) * PAGE_LIMIT;
  const items = await searchers[type](pattern, { from, to: from + PAGE_LIMIT });
  return { query, type, page, groups: { [type]: { items: items.slice(0, PAGE_LIMIT), hasMore: items.length > PAGE_LIMIT } } };
}
