import type { ReactNode } from "react";

/** Bolds each occurrence of the query in the text. */
export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  const parts: ReactNode[] = [];
  let index = 0;
  for (let found = lower.indexOf(needle); found !== -1; found = lower.indexOf(needle, index)) {
    parts.push(text.slice(index, found), <mark key={found}>{text.slice(found, found + needle.length)}</mark>);
    index = found + needle.length;
  }
  parts.push(text.slice(index));
  return <>{parts}</>;
}
