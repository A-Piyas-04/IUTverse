import { describe, expect, it, vi } from "vitest";
import { conversationName, dateLabel, queryString } from "@/lib/format";

describe("page utilities", () => {
  it("builds query strings without empty values", () => {
    expect(queryString({ page: 2, search: "cat", mine: false, empty: "" })).toBe("?page=2&search=cat");
  });

  it("formats recent dates", () => {
    vi.setSystemTime(new Date("2026-06-30T10:00:00Z"));
    expect(dateLabel("2026-06-30T09:55:00Z")).toBe("5m");
    expect(dateLabel("2026-06-30T08:00:00Z")).toBe("2h");
    vi.useRealTimers();
  });
});

describe("conversationName", () => {
  it("names a direct chat after the other member", () => {
    expect(conversationName({ otherUser: { displayName: "Ayesha Rahman" }, title: null })).toBe("Ayesha Rahman");
  });
  it("names a group chat after its title", () => {
    expect(conversationName({ otherUser: null, title: "IUTverse Seed Welcome" })).toBe("IUTverse Seed Welcome");
  });
  it("falls back when neither is known", () => {
    expect(conversationName({})).toBe("IUT member");
  });
});
