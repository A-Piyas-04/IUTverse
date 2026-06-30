import { supabase } from "./supabase";
import type { ApiResult, PaginatedResult } from "./types";

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) { super(message); }
}

const adaptPayload = (value: any): any => {
  if (Array.isArray(value)) return value.map(adaptPayload);
  if (!value || typeof value !== "object") return value;
  const next: any = {};
  for (const [key, item] of Object.entries(value)) next[key] = adaptPayload(item);
  if (next.profile && typeof next.profile === "object") {
    for (const [key, item] of Object.entries(next.profile)) if (next[key] === undefined) next[key] = item;
  }
  if (!next.displayName && next.name) next.displayName = next.name;
  if (!next.profilePictureUrl && next.profile?.profilePicture) next.profilePictureUrl = next.profile.profilePicture;
  return next;
};

const normalize = <T>(payload: any): ApiResult<T> => {
  if (payload?.success === true && "data" in payload) return { ...payload, data: adaptPayload(payload.data) } as ApiResult<T>;
  return { success: true, data: adaptPayload(payload) as T };
};

export async function apiRequest<T>(path: string, options: RequestInit = {}, signal?: AbortSignal): Promise<ApiResult<T>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);
  if (sessionData.session?.access_token) headers.set("Authorization", `Bearer ${sessionData.session.access_token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const response = await fetch(`/api${path}`, { ...options, headers, signal });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new ApiError(payload?.message || `Request failed (${response.status})`, response.status, payload);
  return normalize<T>(payload);
}

export async function apiPage<T>(path: string, signal?: AbortSignal): Promise<PaginatedResult<T>> {
  const result = await apiRequest<any>(path, {}, signal);
  if (Array.isArray(result.data)) return { ...result, data: result.data, pagination: (result as any).pagination ?? { page: 1, limit: result.data.length, total: result.data.length, totalPages: 1 } };
  if (Array.isArray(result.data?.data)) return { success: true, data: result.data.data, pagination: result.data.pagination };
  for (const key of ["posts", "resources", "jobs", "questions", "conversations", "messages"]) {
    if (Array.isArray(result.data?.[key])) {
      const values = key === "conversations" ? result.data[key].map((item: any) => ({ ...item, lastMessage: item.lastMessage?.content || item.lastMessage || "" })) : result.data[key];
      return { success: true, data: values, pagination: result.data.pagination ?? { page: 1, limit: values.length, total: values.length, totalPages: 1 } };
    }
  }
  return { success: true, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
}

export const jsonBody = (value: unknown): RequestInit => ({ body: JSON.stringify(value) });

export const mediaUrl = (value?: string | null) => {
  if (!value) return undefined;
  if (/^https?:\/\//.test(value) || value.startsWith("blob:")) return value;
  return value.startsWith("/") ? value : `/files/${value}`;
};
