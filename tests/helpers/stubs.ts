// In-memory stand-ins for Supabase, shared by the behavioral route tests.
//
// A test file mounts them with:
//   vi.mock("@/server/config/supabase", async () => (await import("../helpers/stubs")).supabaseModule);
//   vi.mock("@/server/services/securityService", async () => (await import("../helpers/stubs")).securityModule);
// Nothing here ever reaches a network except the local Storage server below.
import http from "node:http";
import type { AddressInfo } from "node:net";

// Members by bearer token. Membership and role come from the stubbed
// securityService, exactly where the real middleware reads them.
export const USERS = {
  "user-token": { id: "00000000-0000-4000-8000-000000000001", email: "user@iut-dhaka.edu", role: "user", membershipStatus: "active" },
  "mod-token": { id: "00000000-0000-4000-8000-000000000002", email: "mod@iut-dhaka.edu", role: "mod", membershipStatus: "active" },
  "admin-token": { id: "00000000-0000-4000-8000-000000000003", email: "admin@iut-dhaka.edu", role: "admin", membershipStatus: "active" },
  "suspended-mod-token": { id: "00000000-0000-4000-8000-000000000004", email: "suspended@iut-dhaka.edu", role: "mod", membershipStatus: "suspended" },
} as const;
const userById = (id: string) => Object.values(USERS).find((user) => user.id === id);

type Op = [string, ...any[]];
type DbResult = { data?: any; count?: number | null; error?: any };

// Chainable stand-in for the PostgREST query builder. Every call is recorded;
// awaiting the chain resolves to db.handler(table, ops).
export const db = {
  handler: (() => ({ data: [], count: 0, error: null })) as (table: string, ops: Op[]) => DbResult,
  calls: [] as { table: string; ops: Op[] }[],
  reset() {
    this.handler = () => ({ data: [], count: 0, error: null });
    this.calls = [];
  },
};

const from = (table: string) => {
  const ops: Op[] = [];
  db.calls.push({ table, ops });
  const builder: any = new Proxy({}, {
    get(_target, prop) {
      if (prop === "then") {
        const result = Promise.resolve().then(() => db.handler(table, ops));
        return result.then.bind(result);
      }
      return (...args: any[]) => {
        ops.push([String(prop), ...args]);
        return builder;
      };
    },
  });
  return builder;
};

// In-memory Storage. Signed URLs point at a local HTTP server that honors
// Range requests, like Supabase Storage does.
export const storage = {
  objects: new Map<string, { body: Buffer; contentType?: string }>(),
  calls: [] as any[][],
  url: "",
  put(bucket: string, objectPath: string, body: Buffer | string, contentType?: string) {
    this.objects.set(`${bucket}/${objectPath}`, { body: Buffer.from(body), contentType });
  },
  has(bucket: string, objectPath: string) {
    return this.objects.has(`${bucket}/${objectPath}`);
  },
  reset() {
    this.objects.clear();
    this.calls = [];
  },
};

const objectServer = http.createServer((req, res) => {
  const object = storage.objects.get(decodeURIComponent(new URL(req.url || "/", "http://storage").pathname.slice(1)));
  if (!object) {
    res.statusCode = 404;
    return res.end();
  }
  const range = /^bytes=(\d+)-(\d+)$/.exec(String(req.headers.range || ""));
  if (!range) return res.end(object.body);
  res.statusCode = 206;
  return res.end(object.body.subarray(Number(range[1]), Number(range[2]) + 1));
});

export const startStorageServer = () =>
  new Promise<void>((resolve) => {
    objectServer.listen(0, "127.0.0.1", () => {
      storage.url = `http://127.0.0.1:${(objectServer.address() as AddressInfo).port}`;
      resolve();
    });
  });
export const stopStorageServer = () => new Promise<void>((resolve) => (objectServer.listening ? objectServer.close(() => resolve()) : resolve()));

const bucketApi = (bucket: string) => ({
  createSignedUploadUrl: async (objectPath: string) => {
    storage.calls.push(["createSignedUploadUrl", bucket, objectPath]);
    return { data: { path: objectPath, token: `token-for-${objectPath}`, signedUrl: `${storage.url}/upload/${bucket}/${objectPath}` }, error: null };
  },
  info: async (objectPath: string) => {
    const object = storage.objects.get(`${bucket}/${objectPath}`);
    return object
      ? { data: { size: object.body.length, contentType: object.contentType, metadata: {} }, error: null }
      : { data: null, error: new Error("Object not found") };
  },
  createSignedUrl: async (objectPath: string) => ({ data: { signedUrl: `${storage.url}/${bucket}/${objectPath}` }, error: null }),
  remove: async (paths: string[]) => {
    for (const objectPath of paths) storage.objects.delete(`${bucket}/${objectPath}`);
    storage.calls.push(["remove", bucket, ...paths]);
    return { data: [], error: null };
  },
  upload: async (objectPath: string, body: Buffer, options?: { contentType?: string }) => {
    storage.put(bucket, objectPath, body, options?.contentType);
    storage.calls.push(["upload", bucket, objectPath]);
    return { data: { path: objectPath }, error: null };
  },
  getPublicUrl: () => ({ data: { publicUrl: null } }),
});

export const supabaseAdmin = {
  from,
  rpc: async () => {
    throw new Error("rpc must go through the stubbed securityService");
  },
  auth: {
    getUser: async (token: string) => {
      const user = USERS[token as keyof typeof USERS];
      return user
        ? { data: { user: { id: user.id, email: user.email } }, error: null }
        : { data: { user: null }, error: new Error("invalid token") };
    },
  },
  storage: { from: bucketApi },
};

export const supabaseModule = {
  supabaseAdmin,
  createAuthClient: () => {
    throw new Error("auth client is not available in route tests");
  },
  isSupabaseConfigured: true,
  isSupabaseAdminConfigured: true,
};

// ---------------------------------------------------------------- securityService
export const securityCalls: Record<string, any[]> = {};
const record = (name: string, impl: (args: any) => any) => async (args: any) => {
  (securityCalls[name] ||= []).push(args);
  return impl(args);
};
const defaults = () => ({
  getSecurityContext: async (userId: string) => {
    const user = userById(userId);
    return { membershipStatus: user?.membershipStatus || "missing", membershipSource: "iut_domain", role: user?.role || "user", displayName: null };
  },
  moderateReport: record("moderateReport", async ({ reportId, decision }) => ({ id: reportId, status: decision === "dismiss" ? "dismissed" : "reviewed", review_action: decision })),
  discloseAnonymousPostAuthor: record("discloseAnonymousPostAuthor", async () => ({ user_id: "author", display_name: "Author", handle: "author" })),
  setUserRole: record("setUserRole", async ({ role }) => role),
});

/** Tests replace entries to simulate database errors; resetStubs restores them. */
export const security: Record<string, (args: any) => Promise<any>> = { ...defaults() };

export const securityModule = {
  getSecurityContext: (...args: [string]) => security.getSecurityContext(...args),
  moderateReport: (args: any) => security.moderateReport(args),
  discloseAnonymousPostAuthor: (args: any) => security.discloseAnonymousPostAuthor(args),
  setUserRole: (args: any) => security.setUserRole(args),
};

export const resetStubs = () => {
  Object.assign(security, defaults());
  for (const key of Object.keys(securityCalls)) delete securityCalls[key];
  db.reset();
  storage.reset();
};
