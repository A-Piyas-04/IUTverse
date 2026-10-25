import { afterEach, describe, expect, it, vi } from "vitest";
import { isGifUrl, mapKlipyItems, searchGifs } from "@/server/services/gifService";
import config from "@/server/config/config";

const rendition = (name: string, width = 200, height = 150) => ({ url: `https://static.klipy.com/ii/abc/${name}`, width, height, size: 1000 });

describe("isGifUrl", () => {
  it("accepts only plain https links on KLIPY's CDN", () => {
    expect(isGifUrl("https://static.klipy.com/ii/abc/x.webp")).toBe(true);
    expect(isGifUrl("http://static.klipy.com/ii/abc/x.webp")).toBe(false);
    expect(isGifUrl("https://evil.example/x.webp")).toBe(false);
    expect(isGifUrl("https://static.klipy.com.evil.example/x.webp")).toBe(false);
    expect(isGifUrl("https://user:pass@static.klipy.com/x.webp")).toBe(false);
    expect(isGifUrl("https://static.klipy.com/x.webp?track=1")).toBe(false);
    expect(isGifUrl("javascript:alert(1)")).toBe(false);
    expect(isGifUrl(42)).toBe(false);
  });
});

describe("mapKlipyItems", () => {
  it("uses small WebP for the picker and medium WebP for the message", () => {
    const [gif] = mapKlipyItems([
      { slug: "hello-1", title: "Hello", type: "gif", file: { sm: { webp: rendition("sm.webp", 120, 90), gif: rendition("sm.gif") }, md: { webp: rendition("md.webp", 320, 240) } } },
    ]);
    expect(gif).toEqual({
      id: "hello-1",
      title: "Hello",
      preview: { url: "https://static.klipy.com/ii/abc/sm.webp", width: 120, height: 90 },
      full: { url: "https://static.klipy.com/ii/abc/md.webp", width: 320, height: 240 },
    });
  });

  it("skips ad slots, items without media, and media hosted anywhere else", () => {
    expect(
      mapKlipyItems([
        { slug: "ad-1", type: "ad" },
        { slug: "empty", type: "gif", file: {} },
        { slug: "elsewhere", type: "gif", file: { sm: { gif: { url: "https://evil.example/a.gif", width: 1, height: 1 } } } },
      ]),
    ).toEqual([]);
  });

  it("falls back to GIF and to other sizes when WebP or medium is missing", () => {
    const [gif] = mapKlipyItems([{ slug: "x", file: { xs: { gif: rendition("xs.gif", 60, 60) }, hd: { gif: rendition("hd.gif", 480, 480) } } }]);
    expect(gif.preview.url).toMatch(/xs\.gif$/);
    expect(gif.full.url).toMatch(/hd\.gif$/);
  });
});

describe("searchGifs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    config.gifs.klipyApiKey = null;
  });

  it("is a clear 503 until a KLIPY key is configured", async () => {
    config.gifs.klipyApiKey = null;
    await expect(searchGifs({ query: "", page: 1, userId: "u" })).rejects.toMatchObject({ statusCode: 503 });
  });

  it("calls search with the query and never sends the member's id", async () => {
    config.gifs.klipyApiKey = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: true, data: { data: [], has_next: true } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await searchGifs({ query: "exam", page: 2, userId: "00000000-0000-4000-8000-000000000001" });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/v1/test-key/gifs/search");
    expect(url.searchParams.get("q")).toBe("exam");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("content_filter")).toBe("medium");
    expect(url.searchParams.get("customer_id")).toMatch(/^[0-9a-f]{32}$/);
    expect(url.toString()).not.toContain("00000000-0000-4000-8000-000000000001");
    expect(result).toEqual({ gifs: [], hasNext: true, page: 2 });
  });

  it("uses trending without a query, and reports KLIPY outages as 502", async () => {
    config.gifs.klipyApiKey = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchGifs({ query: "", page: 1, userId: "u" })).rejects.toMatchObject({ statusCode: 502 });
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe("/api/v1/test-key/gifs/trending");
  });
});
