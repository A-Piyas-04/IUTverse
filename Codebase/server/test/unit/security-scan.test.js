const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

test("secret scanner self-test detects representative secrets", () => {
  const serverRoot = path.resolve(__dirname, "../..");
  const output = execFileSync("node", ["scripts/scanSecrets.js", "--self-test"], {
    cwd: serverRoot,
    encoding: "utf8",
  });

  assert.match(output, /Secret scanner self-test passed/);
});
