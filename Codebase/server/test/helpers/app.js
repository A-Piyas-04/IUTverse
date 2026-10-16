// In-process harness for behavioral route tests.
//
// Must be required before anything under src/. It pins every Supabase and DB
// setting to an unroutable local value (dotenv never overrides variables that
// are already set, so server/.env cannot point these tests at a real project),
// then replaces the Supabase client and securityService with stubs.
const path = require("node:path");

Object.assign(process.env, {
  NODE_ENV: "test",
  SUPABASE_URL: "http://127.0.0.1:9",
  SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  DATABASE_URL: "",
  DIRECT_URL: "",
  REDIS_URL: "",
  EMAIL_USER: "",
  EMAIL_PASS: "",
  OPENWEATHER_API_KEY: "",
  EXPOSE_ERRORS: "",
  CORS_ORIGINS: "http://localhost:5174",
  // Generous limits so the limiters never interfere with assertions.
  RATE_LIMIT_GENERAL_MAX: "100000",
  RATE_LIMIT_AUTH_MAX: "100000",
  RATE_LIMIT_CREATE_MAX: "100000",
  RATE_LIMIT_LOOKUP_MAX: "100000",
});

const src = (relative) => path.resolve(__dirname, "../../src", relative);
const stubModule = (relative, exports) => {
  const filename = require.resolve(src(relative));
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
};

// Members by bearer token. Membership and role come from the stubbed
// securityService, exactly where the real middleware reads them.
const USERS = {
  "user-token": { id: "00000000-0000-4000-8000-000000000001", email: "user@iut-dhaka.edu", role: "user", membershipStatus: "active" },
  "mod-token": { id: "00000000-0000-4000-8000-000000000002", email: "mod@iut-dhaka.edu", role: "mod", membershipStatus: "active" },
  "admin-token": { id: "00000000-0000-4000-8000-000000000003", email: "admin@iut-dhaka.edu", role: "admin", membershipStatus: "active" },
  "suspended-mod-token": { id: "00000000-0000-4000-8000-000000000004", email: "suspended@iut-dhaka.edu", role: "mod", membershipStatus: "suspended" },
};
const userById = (id) => Object.values(USERS).find((user) => user.id === id);

// Chainable stand-in for the PostgREST query builder. Every call is recorded;
// awaiting the chain resolves to db.handler(table, ops).
const db = {
  handler: () => ({ data: [], count: 0, error: null }),
  calls: [],
  reset() {
    this.handler = () => ({ data: [], count: 0, error: null });
    this.calls = [];
  },
};
const from = (table) => {
  const ops = [];
  db.calls.push({ table, ops });
  const builder = new Proxy({}, {
    get(_target, prop) {
      if (prop === "then") {
        const result = Promise.resolve().then(() => db.handler(table, ops));
        return result.then.bind(result);
      }
      return (...args) => {
        ops.push([prop, ...args]);
        return builder;
      };
    },
  });
  return builder;
};

const supabaseAdmin = {
  from,
  rpc: async () => {
    throw new Error("rpc must go through the stubbed securityService");
  },
  auth: {
    getUser: async (token) => {
      const user = USERS[token];
      return user
        ? { data: { user: { id: user.id, email: user.email } }, error: null }
        : { data: { user: null }, error: new Error("invalid token") };
    },
  },
  storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: null } }) }) },
};

stubModule("config/supabase.js", {
  supabaseAdmin,
  createAuthClient: () => {
    throw new Error("auth client is not available in route tests");
  },
  isSupabaseConfigured: true,
  isSupabaseAdminConfigured: true,
});

const calls = {};
const record = (name, impl) => async (args) => {
  (calls[name] ||= []).push(args);
  return impl(args);
};
const defaults = () => ({
  getSecurityContext: async (userId) => {
    const user = userById(userId);
    return { membershipStatus: user?.membershipStatus || "missing", membershipSource: "iut_domain", role: user?.role || "user", displayName: null };
  },
  moderateReport: record("moderateReport", async ({ reportId, decision }) => ({ id: reportId, status: decision === "dismiss" ? "dismissed" : "reviewed", review_action: decision })),
  discloseAnonymousPostAuthor: record("discloseAnonymousPostAuthor", async () => ({ user_id: "author", display_name: "Author", handle: "author" })),
  setUserRole: record("setUserRole", async ({ role }) => role),
});
const securityService = { ...defaults() };
stubModule("services/securityService.js", securityService);

const resetStubs = () => {
  Object.assign(securityService, defaults());
  for (const key of Object.keys(calls)) delete calls[key];
  db.reset();
};

const app = require("../../src/app");

let server;
let baseUrl;
const start = () =>
  new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
const stop = () => new Promise((resolve) => (server ? server.close(resolve) : resolve()));

const request = async (method, pathName, { token, body } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${baseUrl}${pathName}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, body: json };
};

module.exports = { USERS, calls, db, request, resetStubs, securityService, start, stop };
