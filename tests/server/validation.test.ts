import { describe, expect, it } from "vitest";
import {
  enumValue,
  filterSearchTerm,
  optionalText,
  pagination,
  positiveInt,
  requiredText,
  sanitizePlainText,
  sanitizePlainTextArray,
  uuid,
} from "@/server/utils/validation";

describe("validation helpers", () => {
  it("sanitizePlainText strips HTML and normalizes whitespace", () => {
    expect(sanitizePlainText("  <script>alert(1)</script>Hello&nbsp;   world  ")).toBe("alert(1)Hello world");
  });

  it("requiredText rejects empty sanitized content", () => {
    expect(requiredText("<b>   </b>", "Content")).toEqual({ ok: false, error: "Content is required" });
    expect(requiredText("a", "Name", { min: 2 })).toEqual({ ok: false, error: "Name must be at least 2 characters long" });
    expect(requiredText(" Hi ", "Name")).toEqual({ ok: true, value: "Hi" });
  });

  it("sanitizePlainTextArray removes empty entries", () => {
    expect(sanitizePlainTextArray([" One ", "<b></b>", "Two"])).toEqual(["One", "Two"]);
    expect(sanitizePlainTextArray("not an array")).toEqual([]);
  });

  it("optionalText maps missing and empty input to null", () => {
    expect(optionalText(undefined)).toBeNull();
    expect(optionalText(null)).toBeNull();
    expect(optionalText("<i></i>")).toBeNull();
    expect(optionalText(" ok ", { max: 1 })).toBe("o");
  });

  it("pagination clamps invalid values and caps limit", () => {
    expect(pagination("0", "500", 100)).toEqual({ page: 1, limit: 100 });
    expect(pagination("3", "5", 100)).toEqual({ page: 3, limit: 5 });
    expect(pagination(undefined, undefined)).toEqual({ page: 1, limit: 20 });
  });

  it("uuid validates Supabase-style user IDs", () => {
    expect(uuid("not-a-uuid", "User ID")).toEqual({ ok: false, error: "User ID must be a valid UUID" });
    expect(uuid("123e4567-e89b-12d3-a456-426614174000", "User ID")).toEqual({ ok: true, value: "123e4567-e89b-12d3-a456-426614174000" });
  });

  it("positiveInt accepts only positive integers", () => {
    for (const value of ["abc", "0", "-1", "1.5", undefined]) expect(positiveInt(value, "ID").ok, String(value)).toBe(false);
    expect(positiveInt("12", "ID")).toEqual({ ok: true, value: 12 });
  });

  it("enumValue lowercases and rejects values outside the list", () => {
    expect(enumValue("LOST", ["lost", "found"], "Type")).toEqual({ ok: true, value: "lost" });
    expect(enumValue("other", ["lost", "found"], "Type")).toEqual({ ok: false, error: "Type must be one of: lost, found" });
  });

  it("filterSearchTerm removes PostgREST filter syntax", () => {
    expect(filterSearchTerm(String.raw`a,b(c)"d\e`)).toBe("a b c  d e");
  });
});
