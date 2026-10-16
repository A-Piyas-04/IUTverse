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

const withEnv = (vars, fn) => {
  const saved = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]));
  Object.assign(process.env, vars);
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test("serverError hides internal detail by default", () => {
  withEnv({ NODE_ENV: "development", EXPOSE_ERRORS: "" }, () => {
    const res = mockRes();
    response.serverError(res, "Unexpected server error", "boom");

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { success: false, message: "Unexpected server error" });
  });
});

test("serverError includes internal detail only when EXPOSE_ERRORS=true outside production", () => {
  withEnv({ NODE_ENV: "development", EXPOSE_ERRORS: "true" }, () => {
    const res = mockRes();
    response.serverError(res, "Unexpected server error", "boom");
    assert.deepEqual(res.body, { success: false, message: "Unexpected server error", error: "boom" });
  });
  withEnv({ NODE_ENV: "production", EXPOSE_ERRORS: "true" }, () => {
    const res = mockRes();
    response.serverError(res, "Unexpected server error", "boom");
    assert.deepEqual(res.body, { success: false, message: "Unexpected server error" });
  });
});
