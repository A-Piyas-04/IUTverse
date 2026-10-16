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

// In-memory Storage. Signed URLs point at a local HTTP server that honors
// Range requests, like Supabase Storage does.
const http = require("node:http");
const storage = {
  objects: new Map(),
  calls: [],
  url: null,
  put(bucket, objectPath, body, contentType) {
    this.objects.set(`${bucket}/${objectPath}`, { body: Buffer.from(body), contentType });
  },
  has(bucket, objectPath) {
    return this.objects.has(`${bucket}/${objectPath}`);
  },
  reset() {
    this.objects.clear();
    this.calls = [];
  },
};
const objectServer = http.createServer((req, res) => {
  const object = storage.objects.get(decodeURIComponent(new URL(req.url, "http://storage").pathname.slice(1)));
  if (!object) {
    res.statusCode = 404;
    return res.end();
  }
  const range = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range || "");
  if (!range) return res.end(object.body);
  res.statusCode = 206;
  return res.end(object.body.subarray(Number(range[1]), Number(range[2]) + 1));
});
const bucketApi = (bucket) => ({
  createSignedUploadUrl: async (objectPath) => {
    storage.calls.push(["createSignedUploadUrl", bucket, objectPath]);
    return { data: { path: objectPath, token: `token-for-${objectPath}`, signedUrl: `${storage.url}/upload/${bucket}/${objectPath}` }, error: null };
  },
  info: async (objectPath) => {
    const object = storage.objects.get(`${bucket}/${objectPath}`);
    return object
      ? { data: { size: object.body.length, contentType: object.contentType, metadata: {} }, error: null }
      : { data: null, error: new Error("Object not found") };
  },
  createSignedUrl: async (objectPath) => ({ data: { signedUrl: `${storage.url}/${bucket}/${objectPath}` }, error: null }),
  remove: async (paths) => {
    for (const objectPath of paths) storage.objects.delete(`${bucket}/${objectPath}`);
    storage.calls.push(["remove", bucket, ...paths]);
    return { data: [], error: null };
  },
  upload: async (objectPath, body, options) => {
    storage.put(bucket, objectPath, body, options?.contentType);
    storage.calls.push(["upload", bucket, objectPath]);
    return { data: { path: objectPath }, error: null };
  },
  getPublicUrl: () => ({ data: { publicUrl: null } }),
});

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
  storage: { from: bucketApi },
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
  storage.reset();
};

const app = require("../../src/app");

let server;
let baseUrl;
const listen = (target) =>
  new Promise((resolve) => {
    const instance = target.listen(0, "127.0.0.1", () => resolve(instance));
  });
const start = async () => {
  server = await listen(app);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await listen(objectServer);
  storage.url = `http://127.0.0.1:${objectServer.address().port}`;
};
const close = (target) => new Promise((resolve) => (target?.listening ? target.close(resolve) : resolve()));
const stop = async () => {
  await close(server);
  await close(objectServer);
};

// `body` is sent as JSON; pass `form` (a FormData) for multipart requests.
const request = async (method, pathName, { token, body, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const payload = form ?? (body === undefined ? undefined : JSON.stringify(body));
  const res = await fetch(`${baseUrl}${pathName}`, { method, headers, body: payload });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, body: json };
};

module.exports = { USERS, calls, db, request, resetStubs, securityService, start, stop, storage };
