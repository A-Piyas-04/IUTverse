import { describe, expect, it } from "vitest";
import { safeDestination } from "./redirect";

describe("safeDestination", () => {
  it("keeps same-site paths, including their query", () => {
    expect(safeDestination("/messages?conversation=4")).toBe("/messages?conversation=4");
    expect(safeDestination("/posts/12")).toBe("/posts/12");
  });

  it("falls back to home when there is nothing to return to", () => {
    expect(safeDestination(null)).toBe("/");
    expect(safeDestination("")).toBe("/");
    expect(safeDestination(undefined, "/community")).toBe("/community");
  });

  it("refuses anything that could leave the site", () => {
    for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "evil.example/path"]) {
      expect(safeDestination(value), value).toBe("/");
    }
  });

  it("does not bounce back to the login or signup page", () => {
    for (const value of ["/login", "/login?next=/jobs", "/signup", "/signup/"]) expect(safeDestination(value), value).toBe("/");
    expect(safeDestination("/loginhelp")).toBe("/loginhelp");
  });
});
