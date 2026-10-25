"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button, Chip, EmptyState } from "@/components/ui/Ui";
import { PageFrame } from "@/components/shell/AppShell";
import { KIND_LABELS, SEARCH_KINDS, SearchHit, rememberSearch, searchSite, type SearchKind } from "./searchModel";
import styles from "./Search.module.css";

const TABS = ["all", ...SEARCH_KINDS] as const;

/** Full results for a search, like Facebook's: everything grouped, or one kind at a time. */
export function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = params.get("q")?.trim() ?? "";
  const rawType = params.get("type") ?? "all";
  const type = (TABS as readonly string[]).includes(rawType) ? (rawType as SearchKind | "all") : "all";
  const [text, setText] = useState(query);
  useEffect(() => setText(query), [query]);
  useEffect(() => rememberSearch(query), [query]);

  const go = (next: { q?: string; type?: string }) => {
    const values = { q: next.q ?? query, type: next.type ?? type };
    router.replace(`${pathname}?${new URLSearchParams(values.type === "all" ? { q: values.q } : values)}`);
  };

  const results = useInfiniteQuery({
    // Not ["search", …]: the navbar dropdown caches single results under that key.
    queryKey: ["search-page", type, query],
    queryFn: ({ pageParam, signal }) => searchSite(query, type, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (type !== "all" && last.data.groups[type as SearchKind]?.hasMore ? pages.length + 1 : undefined),
    enabled: query.length >= 2,
  });
  const groups = results.data?.pages[0]?.data.groups ?? {};
  const kindItems = type === "all" ? [] : results.data?.pages.flatMap((page) => page.data.groups[type as SearchKind]?.items ?? []) ?? [];
  const nothing = results.isSuccess && (type === "all" ? SEARCH_KINDS.every((kind) => !groups[kind]?.items.length) : !kindItems.length);

  return (
    <PageFrame
      title={query ? `Results for “${query}”` : "Search"}
      eyebrow="Search IUTverse"
      tabs={TABS.map((tab) => <Chip key={tab} active={tab === type} onClick={() => go({ type: tab })}>{tab === "all" ? "All" : KIND_LABELS[tab]}</Chip>)}
    >
      <form className={styles.pageForm} role="search" onSubmit={(event) => { event.preventDefault(); if (text.trim().length >= 2) go({ q: text.trim() }); }}>
        <Search size={18} />
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Search people, posts, events, jobs…" aria-label="Search IUTverse" autoFocus={!query} />
        <Button type="submit" disabled={text.trim().length < 2}>Search</Button>
      </form>

      <div className={styles.page}>
        {query.length < 2 && <EmptyState title="What are you looking for?" body="Search for people, posts, events, jobs, academic resources and lost & found." />}
        {results.isLoading && <p className={styles.note}>Searching…</p>}
        {results.isError && <EmptyState title="Search failed" body={results.error.message} />}
        {nothing && <EmptyState title={`No results for “${query}”`} body="Check the spelling, or try fewer or different words." />}

        {type === "all" && SEARCH_KINDS.map((kind) => {
          const group = groups[kind];
          if (!group?.items.length) return null;
          return (
            <section key={kind} className={styles.card} aria-label={KIND_LABELS[kind]}>
              <h2>{KIND_LABELS[kind]}</h2>
              {group.items.map((item) => <SearchHit key={(item as { id: number }).id} kind={kind} item={item} query={query} />)}
              {group.hasMore && <Link className={styles.more} href={`/search?${new URLSearchParams({ q: query, type: kind })}`} onClick={(event) => { event.preventDefault(); go({ type: kind }); }}>See all {KIND_LABELS[kind].toLowerCase()}</Link>}
            </section>
          );
        })}

        {type !== "all" && kindItems.length > 0 && (
          <section className={styles.card} aria-label={KIND_LABELS[type as SearchKind]}>
            {kindItems.map((item) => <SearchHit key={(item as { id: number }).id} kind={type as SearchKind} item={item} query={query} />)}
            {results.hasNextPage && <div className={styles.moreRow}><Button variant="secondary" onClick={() => void results.fetchNextPage()} disabled={results.isFetchingNextPage}>{results.isFetchingNextPage ? "Loading…" : "Show more"}</Button></div>}
          </section>
        )}
      </div>
    </PageFrame>
  );
}
