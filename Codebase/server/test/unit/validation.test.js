const test = require("node:test");
const assert = require("node:assert/strict");

const {
  pagination,
  requiredText,
  sanitizePlainText,
  sanitizePlainTextArray,
  uuid,
} = require("../../src/utils/validation");

test("sanitizePlainText strips HTML and normalizes whitespace", () => {
  assert.equal(
    sanitizePlainText("  <script>alert(1)</script>Hello&nbsp;   world  "),
    "alert(1)Hello world"
  );
});

test("requiredText rejects empty sanitized content", () => {
  assert.deepEqual(requiredText("<b>   </b>", "Content"), {
    error: "Content is required",
  });
});

test("sanitizePlainTextArray removes empty entries", () => {
  assert.deepEqual(sanitizePlainTextArray([" One ", "<b></b>", "Two"]), ["One", "Two"]);
});

test("pagination clamps invalid values and caps limit", () => {
  assert.deepEqual(pagination("0", "500", 100), { page: 1, limit: 100 });
  assert.deepEqual(pagination("3", "5", 100), { page: 3, limit: 5 });
});

test("uuid validates Supabase-style user IDs", () => {
  assert.equal(uuid("not-a-uuid", "User ID").error, "User ID must be a valid UUID");
  assert.equal(
    uuid("123e4567-e89b-12d3-a456-426614174000", "User ID").value,
    "123e4567-e89b-12d3-a456-426614174000"
  );
});
