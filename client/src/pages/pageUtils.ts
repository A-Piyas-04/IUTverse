export function dateLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value); const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000); const hours = Math.floor(minutes / 60); const days = Math.floor(hours / 24);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
}

export function queryString(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== "" && value !== false) params.set(key, String(value)); });
  const text = params.toString(); return text ? `?${text}` : "";
}
