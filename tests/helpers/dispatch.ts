// Runs requests through the same code a deployment runs: proxy.ts first, then
// the Route Handler that Next's file-system routing would pick. Request and
// response are the standard Web objects, so no server needs to listen.
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const API_ROOT = path.resolve(__dirname, "../../src/app/api");
export const BASE_URL = "http://localhost:3000";

export interface RouteEntry {
  /** URL pattern such as /api/jobs/[id]/comments */
  pattern: string;
  file: string;
  segments: string[];
}

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));

export const routeTable = (): RouteEntry[] =>
  walk(API_ROOT)
    .filter((file) => path.basename(file) === "route.ts")
    .map((file) => {
      const segments = ["api", ...path.relative(API_ROOT, path.dirname(file)).split(path.sep).filter(Boolean)];
      return { pattern: `/${segments.join("/")}`, file, segments };
    });

const isDynamic = (segment: string) => /^\[.+\]$/.test(segment);

/** Picks the route Next would: same segment count, static segments beat dynamic ones from the left. */
export const matchRoute = (pathname: string, table = routeTable()) => {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const candidates = table
    .filter((entry) => entry.segments.length === parts.length && entry.segments.every((segment, index) => isDynamic(segment) || segment === parts[index]))
    .sort((a, b) => {
      for (let index = 0; index < a.segments.length; index += 1) {
        const diff = Number(isDynamic(a.segments[index])) - Number(isDynamic(b.segments[index]));
        if (diff) return diff;
      }
      return 0;
    });
  const entry = candidates[0];
  if (!entry) return null;
  const params = Object.fromEntries(entry.segments.flatMap((segment, index) => (isDynamic(segment) ? [[segment.slice(1, -1), parts[index]]] : [])));
  return { entry, params };
};

const modules = new Map<string, Promise<Record<string, unknown>>>();
const load = (file: string) => {
  if (!modules.has(file)) modules.set(file, import(/* @vite-ignore */ file));
  return modules.get(file)!;
};

export const dispatch = async (request: NextRequest): Promise<Response> => {
  const url = new URL(request.url);

  // proxy.ts: CORS guard and preflight. Anything but "continue" ends the request.
  const proxied = await proxy(request);
  if (!proxied.headers.get("x-middleware-next")) return proxied;

  const matched = matchRoute(url.pathname);
  if (!matched) return new Response("Not found", { status: 404 });
  const handler = (await load(matched.entry.file))[request.method] as ((request: NextRequest, segment: { params: Promise<Record<string, string>> }) => Promise<Response>) | undefined;
  if (!handler) return new Response("Method Not Allowed", { status: 405 });

  const response = await handler(request, { params: Promise.resolve(matched.params) });
  // Headers the proxy added (CORS) travel with the final response.
  const headers = new Headers(response.headers);
  proxied.headers.forEach((value, key) => {
    if (!key.startsWith("x-middleware") && !headers.has(key)) headers.set(key, value);
  });
  return new Response(response.body, { status: response.status, headers });
};

export interface RequestOptions {
  token?: string;
  /** Sent as JSON. */
  body?: unknown;
  /** Sent as multipart. */
  form?: FormData;
  headers?: Record<string, string>;
  /** Raw body for malformed-input tests. */
  raw?: string;
}

export const makeRequest = (method: string, pathName: string, { token, body, form, headers: extra = {}, raw }: RequestOptions = {}) => {
  const headers: Record<string, string> = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined || raw !== undefined) headers["Content-Type"] = headers["Content-Type"] || "application/json";
  const payload = form ?? raw ?? (body === undefined ? undefined : JSON.stringify(body));
  return new NextRequest(`${BASE_URL}${pathName}`, { method, headers, body: payload });
};

/** `body` is parsed JSON when the response is JSON, else null. */
export const request = async (method: string, pathName: string, options: RequestOptions = {}) => {
  const res = await dispatch(makeRequest(method, pathName, options));
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch { /* not JSON */ }
  return { status: res.status, body: json, headers: res.headers, text };
};
