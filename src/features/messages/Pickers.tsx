"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { EMOJI_CATEGORIES, readRecentEmoji, rememberEmoji, searchEmoji } from "./emojiData";
import { searchGifs, type GifChoice } from "./chatApi";
import styles from "./Chat.module.css";

/** Closes a popover on Escape or a press outside it (and outside its toggle button). */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void, ignore?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const press = (event: PointerEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target) || ignore?.current?.contains(target)) return;
      onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", press);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", press);
      document.removeEventListener("keydown", key);
    };
  }, [ignore, onClose, open, ref]);
}

export function EmojiPicker({ onPick, onClose, toggle, className = "" }: { onPick(emoji: string): void; onClose(): void; toggle?: RefObject<HTMLElement | null>; className?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [recent] = useState(readRecentEmoji);
  useDismiss(panel, true, onClose, toggle);
  const results = useMemo(() => searchEmoji(query), [query]);
  const pick = (emoji: string) => {
    rememberEmoji(emoji);
    onPick(emoji);
  };
  const grid = (emojis: string[]) => (
    <div className={styles.emojiGrid}>
      {emojis.map((emoji) => <button key={emoji} type="button" aria-label={emoji} onClick={() => pick(emoji)}>{emoji}</button>)}
    </div>
  );
  const shown = EMOJI_CATEGORIES.find((item) => item.id === category) ?? EMOJI_CATEGORIES[0];
  return (
    <div ref={panel} className={`${styles.picker} ${className}`} role="dialog" aria-label="Emoji">
      <div className={styles.pickerSearch}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search emoji" aria-label="Search emoji" autoFocus />
      </div>
      {!query && (
        <div className={styles.pickerTabs}>
          {EMOJI_CATEGORIES.map((item) => <button key={item.id} type="button" aria-pressed={item.id === category} onClick={() => setCategory(item.id)}>{item.label}</button>)}
        </div>
      )}
      <div className={styles.pickerBody}>
        {query ? (
          results.length ? grid(results) : <p className={styles.pickerNote}>No emoji match “{query}”.</p>
        ) : (
          <>
            {recent.length > 0 && <><p className={styles.pickerLabel}>Recent</p>{grid(recent)}</>}
            <p className={styles.pickerLabel}>{shown.label}</p>
            {grid(shown.emojis.map(([emoji]) => emoji))}
          </>
        )}
      </div>
    </div>
  );
}

export function GifPicker({ onPick, onClose, toggle }: { onPick(gif: GifChoice): void; onClose(): void; toggle?: RefObject<HTMLElement | null> }) {
  const panel = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  useDismiss(panel, true, onClose, toggle);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(timer);
  }, [input]);
  const results = useInfiniteQuery({
    queryKey: ["gifs", query],
    queryFn: ({ pageParam, signal }) => searchGifs(query, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.data.hasNext ? last.data.page + 1 : undefined),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const gifs = results.data?.pages.flatMap((page) => page.data.gifs) ?? [];
  const notSetUp = results.error instanceof ApiError && results.error.status === 503;
  return (
    <div ref={panel} className={styles.picker} role="dialog" aria-label="GIFs">
      <div className={styles.pickerSearch}>
        {/* KLIPY's terms ask for this exact placeholder. */}
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search KLIPY" aria-label="Search GIFs" autoFocus />
      </div>
      <div className={styles.pickerBody}>
        {results.isLoading && <p className={styles.pickerNote}>Loading GIFs…</p>}
        {notSetUp && <p className={styles.pickerNote}>GIFs aren’t set up on this site yet.</p>}
        {results.isError && !notSetUp && <p className={styles.pickerNote}>GIFs could not load. Try again in a moment.</p>}
        {results.isSuccess && !gifs.length && <p className={styles.pickerNote}>No GIFs found.</p>}
        <div className={styles.gifGrid}>
          {gifs.map((gif) => (
            <button key={gif.id} type="button" onClick={() => onPick(gif)} aria-label={`Send GIF: ${gif.title}`}>
              <img src={gif.preview.url} width={gif.preview.width} height={gif.preview.height} alt="" loading="lazy" />
            </button>
          ))}
        </div>
        {results.hasNextPage && (
          <div className={styles.loadEarlier}>
            <button type="button" className={styles.reaction} onClick={() => void results.fetchNextPage()} disabled={results.isFetchingNextPage}>
              {results.isFetchingNextPage ? "Loading…" : "More GIFs"}
            </button>
          </div>
        )}
      </div>
      <div className={styles.pickerFoot}>Powered by KLIPY</div>
    </div>
  );
}
