import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiPage, apiRequest, apiUrl, jsonBody, mediaUrl, resolveApiLink } from "./api";

const auth = vi.hoisted(() => ({ token: "token-1" as string | null }));
vi.mock("./supabase", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: auth.token ? { access_token: auth.token } : null } }) } },
}));

const reply = (body: unknown, init: ResponseInit = {}) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    headers: { "content-type": typeof body === "string" ? "text/plain" : "application/json" },
    ...init,
  });

const fetchMock = vi.fn();

beforeEach(() => {
  auth.token = "token-1";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("URLs", () => {
  it("serves the API from the same origin under /api", () => {
    expect(apiUrl("/posts")).toBe("/api/posts");
    expect(apiUrl("posts")).toBe("/api/posts");
  });

  it("resolves server-provided /api links and leaves others alone", () => {
    expect(resolveApiLink("/api/academic/resources/4/file")).toBe("/api/academic/resources/4/file");
    expect(resolveApiLink("https://example.org/x")).toBe("https://example.org/x");
    expect(resolveApiLink(null)).toBeUndefined();
  });

  it("builds media URLs", () => {
    expect(mediaUrl(undefined)).toBeUndefined();
    expect(mediaUrl("https://cdn.example/a.png")).toBe("https://cdn.example/a.png");
    expect(mediaUrl("blob:abc")).toBe("blob:abc");
    expect(mediaUrl("/files/a.png")).toBe("/files/a.png");
    expect(mediaUrl("a.png")).toBe("/files/a.png");
  });
});

describe("apiRequest", () => {
  it("sends the member's access token and JSON bodies", async () => {
    fetchMock.mockResolvedValue(reply({ success: true, data: { ok: true } }));
    const result = await apiRequest("/reports", { method: "POST", ...jsonBody({ a: 1 }) });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/reports");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-1");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(result).toEqual({ success: true, data: { ok: true } });
  });

  it("leaves multipart bodies to the browser and omits the token when signed out", async () => {
    auth.token = null;
    fetchMock.mockResolvedValue(reply({ success: true, data: {} }));
    await apiRequest("/posts", { method: "POST", body: new FormData() });
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("Content-Type")).toBeNull();
    expect(headers.get("Authorization")).toBeNull();
  });

  it("throws an ApiError carrying the server's message and status", async () => {
    fetchMock.mockResolvedValue(reply({ success: false, message: "Forbidden" }, { status: 403 }));
    const error = await apiRequest("/reports").catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Forbidden", status: 403 });
  });

  it("wraps bare payloads in the success envelope and flattens nested profiles", async () => {
    fetchMock.mockResolvedValue(reply({ id: "u1", name: "Nuren", profile: { bio: "Hi", profilePicture: "p.png" } }));
    const { data } = await apiRequest<any>("/profile/me");
    expect(data).toMatchObject({ id: "u1", displayName: "Nuren", bio: "Hi", profilePictureUrl: "p.png" });
  });
});

describe("apiPage", () => {
  it("accepts the pagination envelopes the server uses", async () => {
    fetchMock.mockResolvedValueOnce(reply({ success: true, data: [{ id: 1 }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } }));
    expect((await apiPage("/jobs")).data).toEqual([{ id: 1 }]);

    fetchMock.mockResolvedValueOnce(reply({ success: true, data: { posts: [{ id: 2 }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } } }));
    expect((await apiPage("/cat-posts")).data).toEqual([{ id: 2 }]);

    fetchMock.mockResolvedValueOnce(reply({ success: true, data: { data: [{ id: 3 }], pagination: { page: 2, limit: 5, total: 6, totalPages: 2 } } }));
    expect((await apiPage("/x")).pagination.page).toBe(2);
  });

  it("returns an empty page for an unrecognised shape", async () => {
    fetchMock.mockResolvedValue(reply({ success: true, data: { other: true } }));
    expect(await apiPage("/x")).toMatchObject({ data: [], pagination: { total: 0 } });
  });
});
