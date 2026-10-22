import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("secret scanner", () => {
  it("self-test detects representative secrets", () => {
    const output = execFileSync("node", ["scripts/scanSecrets.js", "--self-test"], {
      cwd: path.resolve(__dirname, "../.."),
      encoding: "utf8",
    });
    expect(output).toMatch(/Secret scanner self-test passed/);
  });
});
