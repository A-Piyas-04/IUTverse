"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, BriefcaseBusiness, CalendarDays, MapPin, MessageSquareText, UsersRound } from "lucide-react";
import { Avatar } from "@/components/ui/Ui";
import { apiRequest, mediaUrl } from "@/lib/api";
import { dateLabel } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { Highlight } from "@/components/shared/Highlight";
import styles from "./Search.module.css";

export const SEARCH_KINDS = ["people", "posts", "events", "jobs", "resources", "lostFound"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export interface PostHit { id: number; content: string; isAnonymous: boolean; author: Profile | null; imageUrl: string | null; reactionCount: number; commentCount: number; createdAt: string }
export interface EventHit { id: number; title: string; description: string; location: string; eventDate: string }
export interface JobHit { id: number; title: string; type: string; organization: string | null; description: string }
export interface ResourceHit { id: number; title: string; type: string; courseCode: string | null; description: string }
export interface LostFoundHit { id: number; type: "lost" | "found"; title: string; description: string; location: string; status: string }

export interface SearchResponse {
  query: string;
  type: SearchKind | "all";
  groups: Partial<Record<SearchKind, { items: unknown[]; hasMore: boolean }>>;
}

export const searchSite = (query: string, type: SearchKind | "all" = "all", page = 1, signal?: AbortSignal) =>
  apiRequest<SearchResponse>(`/search?${new URLSearchParams({ q: query, type, page: String(page) })}`, {}, signal);

export const KIND_LABELS: Record<SearchKind, string> = {
  people: "People",
  posts: "Posts",
  events: "Events",
  jobs: "Jobs",
  resources: "Academic resources",
  lostFound: "Lost & found",
};

const KIND_ICONS = { events: CalendarDays, jobs: BriefcaseBusiness, resources: BookOpen, lostFound: MapPin, posts: MessageSquareText, people: UsersRound };

/** Where a result opens: its own page, or its list filtered to it. */
export function hitHref(kind: SearchKind, hit: { id: number | string; title?: string }) {
  const filtered = (path: string) => `${path}?q=${encodeURIComponent(hit.title || "")}`;
  switch (kind) {
    case "people": return `/profile/${hit.id}`;
    case "posts": return `/posts/${hit.id}`;
    case "events": return "/events";
    case "jobs": return filtered("/jobs");
    case "resources": return filtered("/academic");
    case "lostFound": return filtered("/lost-and-found");
  }
}

function Row({ href, media, title, meta, onPick, active }: { href: string; media: ReactNode; title: ReactNode; meta?: ReactNode; onPick?(): void; active?: boolean }) {
  return (
    <Link href={href} className={`${styles.hit} ${active ? styles.hitActive : ""}`} onClick={onPick} data-search-hit>
      <span className={styles.hitMedia}>{media}</span>
      <span className={styles.hitText}><strong>{title}</strong>{meta && <small>{meta}</small>}</span>
    </Link>
  );
}

/** One search result, drawn for its kind. */
export function SearchHit({ kind, item, query, onPick, active }: { kind: SearchKind; item: unknown; query: string; onPick?(): void; active?: boolean }) {
  const Icon = KIND_ICONS[kind];
  const iconBox = <span className={styles.kindIcon}><Icon size={18} /></span>;
  switch (kind) {
    case "people": {
      const person = item as Profile;
      return <Row href={hitHref(kind, person)} onPick={onPick} active={active} media={<Avatar size={40} name={person.displayName} src={mediaUrl(person.profilePictureUrl)} />} title={<Highlight text={person.displayName} query={query} />} meta={[person.department, person.batch ? `Batch ${person.batch}` : null].filter(Boolean).join(" · ") || "IUT member"} />;
    }
    case "posts": {
      const post = item as PostHit;
      const author = post.isAnonymous ? "Anonymous" : post.author?.displayName || "IUT member";
      return (
        <Row
          href={hitHref(kind, post)}
          onPick={onPick}
          active={active}
          media={post.isAnonymous ? iconBox : <Avatar size={40} name={author} src={mediaUrl(post.author?.profilePictureUrl)} />}
          title={<span className={styles.clamp}><Highlight text={post.content} query={query} /></span>}
          meta={`${author} · ${dateLabel(post.createdAt)} · ${post.reactionCount} reactions · ${post.commentCount} replies`}
        />
      );
    }
    case "events": {
      const event = item as EventHit;
      return <Row href={hitHref(kind, event)} onPick={onPick} active={active} media={iconBox} title={<Highlight text={event.title} query={query} />} meta={`${new Date(event.eventDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${event.location}`} />;
    }
    case "jobs": {
      const job = item as JobHit;
      return <Row href={hitHref(kind, job)} onPick={onPick} active={active} media={iconBox} title={<Highlight text={job.title} query={query} />} meta={[job.organization, job.type].filter(Boolean).join(" · ")} />;
    }
    case "resources": {
      const resource = item as ResourceHit;
      return <Row href={hitHref(kind, resource)} onPick={onPick} active={active} media={iconBox} title={<Highlight text={resource.title} query={query} />} meta={[resource.courseCode, resource.type.replace("_", " ").toLowerCase()].filter(Boolean).join(" · ")} />;
    }
    case "lostFound": {
      const entry = item as LostFoundHit;
      return <Row href={hitHref(kind, entry)} onPick={onPick} active={active} media={iconBox} title={<Highlight text={entry.title} query={query} />} meta={`${entry.type === "lost" ? "Lost" : "Found"} · ${entry.location}${entry.status === "resolved" ? " · Resolved" : ""}`} />;
    }
  }
}

const RECENT_KEY = "iutverse-recent-searches";

export const readRecentSearches = (): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
};

export const rememberSearch = (query: string) => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([trimmed, ...readRecentSearches().filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8)));
  } catch {
    // Recent searches are a convenience.
  }
};

export const forgetSearch = (query: string) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(readRecentSearches().filter((item) => item !== query)));
  } catch {
    // Nothing to forget without storage.
  }
};
