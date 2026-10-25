// GIF search for chat, through KLIPY (Tenor's API closed on 2026-06-30). The
// API key stays on the server; browsers only ever see KLIPY's CDN URLs.
import "server-only";
import { createHash } from "node:crypto";
import config from "../config/config";
import { PublicError } from "../http/errors";

const API = "https://api.klipy.com/api/v1";
/** Where KLIPY serves media. GIF messages may only point here. */
export const GIF_HOST = "static.klipy.com";
const PER_PAGE = 24;

interface Rendition { url?: string; width?: number; height?: number }
type Formats = Partial<Record<"gif" | "webp" | "mp4" | "jpg" | "webm", Rendition>>;
interface KlipyItem {
  slug?: string;
  title?: string;
  type?: string;
  file?: Partial<Record<"hd" | "md" | "sm" | "xs", Formats>>;
}

export interface GifResult {
  id: string;
  title: string;
  /** Small rendition for the picker grid. */
  preview: { url: string; width: number; height: number };
  /** The rendition sent in the message. */
  full: { url: string; width: number; height: number };
}

export const isGifUrl = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 500) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === GIF_HOST && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
};

// Animated WebP is several times smaller than the GIF of the same clip.
const pick = (formats: Formats | undefined) => {
  const rendition = formats?.webp?.url ? formats.webp : formats?.gif;
  if (!rendition?.url || !isGifUrl(rendition.url) || !rendition.width || !rendition.height) return null;
  return { url: rendition.url, width: Math.round(rendition.width), height: Math.round(rendition.height) };
};

export const mapKlipyItems = (items: KlipyItem[] = []): GifResult[] =>
  items.flatMap((item) => {
    // Results can include ad slots, which have no media files.
    if (!item?.slug || (item.type && item.type !== "gif")) return [];
    const preview = pick(item.file?.sm) || pick(item.file?.xs);
    const full = pick(item.file?.md) || pick(item.file?.hd) || preview;
    return preview && full ? [{ id: item.slug, title: String(item.title || "GIF").slice(0, 120), preview, full }] : [];
  });

export const isGifSearchConfigured = () => Boolean(config.gifs.klipyApiKey);

/** Trending GIFs when `query` is empty, search results otherwise. */
export const searchGifs = async ({ query, page, userId }: { query: string; page: number; userId: string }) => {
  const key = config.gifs.klipyApiKey;
  if (!key) throw new PublicError("GIF search is not set up", 503);
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(PER_PAGE),
    // KLIPY wants a stable per-user id; send a hash, not the member's id.
    customer_id: createHash("sha256").update(`iutverse:${userId}`).digest("hex").slice(0, 32),
    locale: "bd",
    content_filter: "medium",
    format_filter: "webp,gif",
  });
  if (query) params.set("q", query);
  const endpoint = `${API}/${encodeURIComponent(key)}/gifs/${query ? "search" : "trending"}?${params}`;

  let payload: any;
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) throw new Error(`KLIPY responded ${response.status}`);
    payload = await response.json();
  } catch {
    throw new PublicError("GIF search is unavailable right now", 502);
  }
  return {
    gifs: mapKlipyItems(payload?.data?.data),
    hasNext: Boolean(payload?.data?.has_next),
    page,
  };
};
