import { afterEach, describe, expect, it, vi } from "vitest";
import { readStored, removeStored, writeStored } from "./storage";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("safe storage", () => {
  it("round-trips a value", () => {
    writeStored("draft", "hello");
    expect(readStored("draft")).toBe("hello");
    removeStored("draft");
    expect(readStored("draft")).toBeNull();
  });

  it("never throws when the browser blocks storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readStored("draft")).toBeNull();
    expect(() => writeStored("draft", "x")).not.toThrow();
    expect(() => removeStored("draft")).not.toThrow();
  });
});
