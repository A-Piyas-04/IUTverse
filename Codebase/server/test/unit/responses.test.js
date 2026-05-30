const test = require("node:test");
const assert = require("node:assert/strict");

const response = require("../../src/utils/responses");

const mockRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  return res;
};

test("success sends the standard success envelope with extras", () => {
  const res = mockRes();
  response.success(res, [{ id: 1 }], null, {
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    data: [{ id: 1 }],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  });
});

test("serverError sends the standard error envelope", () => {
  const res = mockRes();
  response.serverError(res, "Unexpected server error", "boom");

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    success: false,
    message: "Unexpected server error",
    error: "boom",
  });
});
