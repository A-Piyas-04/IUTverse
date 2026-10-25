"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock3, Search, X } from "lucide-react";
import { useDismiss } from "@/features/messages/Pickers";
import { KIND_LABELS, SEARCH_KINDS, SearchHit, forgetSearch, hitHref, readRecentSearches, rememberSearch, searchSite, type SearchKind } from "./searchModel";
import styles from "./Search.module.css";

export const searchPageHref = (query: string, type: SearchKind | "all" = "all") =>
  `/search?${new URLSearchParams(type === "all" ? { q: query } : { q: query, type })}`;

/**
 * The navbar search, Facebook-style: as you type, the best matches appear
 * grouped by kind (people, posts, events, jobs, resources, lost & found), with
 * "See all results" leading to the full results page.
 */
export function GlobalSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  useDismiss(box, open, () => setOpen(false));

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 220);
    return () => clearTimeout(timer);
  }, [text]);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => setActive(-1), [query]);

  const results = useQuery({
    queryKey: ["search", "all", query],
    queryFn: ({ signal }) => searchSite(query, "all", 1, signal),
    enabled: open && query.length >= 2,
    staleTime: 30_000,
  });

  // Every result in display order, for the arrow keys.
  const flat = useMemo(
    () => SEARCH_KINDS.flatMap((kind) => ((results.data?.data.groups[kind]?.items as { id: number | string; title?: string }[]) || []).map((item) => ({ kind, item }))),
    [results.data],
  );

  const showAll = (value = text) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    rememberSearch(trimmed);
    setOpen(false);
    input.current?.blur();
    router.push(searchPageHref(trimmed));
  };

  const pick = () => {
    rememberSearch(text);
    setOpen(false);
  };

  const onKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const total = flat.length + 1; // the results plus "See all"
      setActive((current) => (event.key === "ArrowDown" ? (current + 1) % total : (current - 1 + total) % total));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = flat[active];
      if (chosen) {
        pick();
        router.push(hitHref(chosen.kind, chosen.item));
      } else showAll();
    } else if (event.key === "Escape") {
      setOpen(false);
      input.current?.blur();
    }
  };

  let index = -1;
  const typing = text.trim().length >= 2;

  return (
    <div ref={box} className={styles.global}>
      <label className={className}>
        <Search size={18} />
        <span className="sr-only">Search IUTverse</span>
        <input
          ref={input}
          type="search"
          value={text}
          placeholder="Search IUTverse"
          role="combobox"
          aria-expanded={open}
          aria-controls="global-search-results"
          aria-autocomplete="list"
          onChange={(event) => { setText(event.target.value); setOpen(true); }}
          onFocus={() => { setRecent(readRecentSearches()); setOpen(true); }}
          onKeyDown={onKey}
        />
      </label>
      {open && (
        <div id="global-search-results" className={styles.dropdown} role="listbox" aria-label="Search results">
          {!typing && (
            recent.length ? (
              <>
                <p className={styles.groupLabel}>Recent searches</p>
                {recent.map((item) => (
                  <div key={item} className={styles.recent}>
                    <button type="button" onClick={() => { setText(item); showAll(item); }}><Clock3 size={16} />{item}</button>
                    <button type="button" aria-label={`Remove ${item} from recent searches`} onClick={() => { forgetSearch(item); setRecent(readRecentSearches()); }}><X size={15} /></button>
                  </div>
                ))}
              </>
            ) : (
              <p className={styles.note}>Search for people, posts, events, jobs, resources and lost &amp; found.</p>
            )
          )}
          {typing && results.isLoading && <p className={styles.note}>Searching…</p>}
          {typing && results.isError && <p className={styles.note}>{results.error.message}</p>}
          {typing && results.isSuccess && !flat.length && <p className={styles.note}>No results for “{query}”.</p>}
          {typing && SEARCH_KINDS.map((kind) => {
            const items = results.data?.data.groups[kind]?.items || [];
            if (!items.length) return null;
            return (
              <section key={kind} aria-label={KIND_LABELS[kind]}>
                <p className={styles.groupLabel}>{KIND_LABELS[kind]}</p>
                {items.map((item) => {
                  index += 1;
                  return <SearchHit key={`${kind}-${(item as { id: number }).id}`} kind={kind} item={item} query={query} onPick={pick} active={index === active} />;
                })}
              </section>
            );
          })}
          {typing && (
            <button type="button" className={`${styles.seeAll} ${active === flat.length ? styles.hitActive : ""}`} onClick={() => showAll()}>
              <Search size={16} />See all results for “{text.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
