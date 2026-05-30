const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const serverRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(serverRoot, "../..");
const srcRoot = path.join(serverRoot, "src");

const read = (relativePath) => fs.readFileSync(path.join(serverRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(serverRoot, relativePath));

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full;
  });

const srcText = () =>
  walk(srcRoot)
    .filter((file) => file.endsWith(".js"))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

let server;
let baseUrl;

test.before(async () => {
  const app = require("../../src/app");
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
});

const request = (pathName, options = {}) => fetch(`${baseUrl}${pathName}`, options);

test("BUG-001 tracked env secrets are blocked by scanner coverage", () => {
  const trackedEnvFiles = execFileSync("git", ["ls-files", "Codebase/server/.env", ".env"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  assert.equal(trackedEnvFiles, "");
  assert.match(read("scripts/scanSecrets.js"), /known leaked Gmail app password/);
});

test("BUG-002 signup responses do not expose plaintext devPassword", () => {
  assert.doesNotMatch(read("src/controllers/authController.js"), /devPassword|password:\s*password/);
});

test("BUG-003 passwords are not logged in plaintext", () => {
  assert.doesNotMatch(read("src/controllers/authController.js"), /console\.log|Password for|password.*logger/i);
});

test("BUG-004 active signup no longer generates weak email-derived passwords", () => {
  assert.doesNotMatch(read("src/utils/authUtils.js"), /generatePassword|Math\.random|email.*slice/i);
  assert.match(read("src/controllers/authController.js"), /password\.length < 8/);
});

test("BUG-005 password reset and change routes exist", () => {
  const routes = read("src/routes/authRoutes.js");
  assert.match(routes, /password\/reset-request/);
  assert.match(routes, /router\.put\('\/password', authenticateToken/);
});

test("BUG-006 CORS rejects unapproved browser origins", async () => {
  const res = await request("/", { headers: { Origin: "https://evil.example" } });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).success, false);
});

test("BUG-007 API/auth/write rate limiters are wired", () => {
  assert.match(read("src/app.js"), /app\.use\("\/api", apiLimiter\)/);
  assert.match(read("src/routes/authRoutes.js"), /authLimiter/);
  assert.match(read("src/routes/postRoutes.js"), /createLimiter/);
});

test("BUG-008 security headers are emitted and x-powered-by is disabled", async () => {
  const res = await request("/");
  assert.equal(res.headers.get("x-powered-by"), null);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
});

test("BUG-009 JWT fallback secret is removed", () => {
  assert.doesNotMatch(read("src/config/config.js"), /your-secret-key-change-in-production|jwtSecret:\s*process\.env\.JWT_SECRET\s*\|\|/);
});

test("BUG-010 user enumeration requires auth and admin role", async () => {
  const res = await request("/api/auth/users");
  assert.equal(res.status, 401);
  assert.match(read("src/routes/authRoutes.js"), /authenticateToken,\s*requireAdmin,\s*getAllUsers/);
});

test("BUG-011 lost-and-found writes require auth and no userId=1 fallback remains", async () => {
  const res = await request("/api/lost-and-found", { method: "POST" });
  assert.equal(res.status, 401);
  assert.doesNotMatch(read("src/controllers/lostAndFoundController.js"), /userId\s*=\s*1/);
});

test("BUG-012 cat post creation requires auth", async () => {
  const res = await request("/api/cat-posts", { method: "POST" });
  assert.equal(res.status, 401);
});

test("BUG-013 Cat Q&A create/answer routes require auth", async () => {
  const res = await request("/api/cat-qa/questions", { method: "POST" });
  assert.equal(res.status, 401);
  assert.match(read("src/routes/catQARoutes.js"), /router\.post\('\/questions', authenticateToken/);
});

test("BUG-014 oversized JSON returns 413 instead of an unhandled 500", async () => {
  const res = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "x@iut-dhaka.edu", password: "a".repeat(1024 * 1024 + 1) }),
  });
  assert.equal(res.status, 413);
  assert.equal((await res.json()).message, "Request body too large");
});

test("BUG-015 only the active auth middleware remains in src", () => {
  assert.equal(exists("src/middleware/authMiddleware.js"), false);
  assert.match(read("src/middleware/auth.js"), /authenticateToken/);
});

test("BUG-016 auth middleware normalizes req.user.id and req.user.userId", () => {
  const auth = read("src/middleware/auth.js");
  assert.match(auth, /id:\s*data\.user\.id/);
  assert.match(auth, /userId:\s*data\.user\.id/);
  assert.match(auth, /id:\s*user\.userId \|\| user\.id/);
});

test("BUG-017 lost-and-found route is mounted once", () => {
  const mounts = read("src/routes/index.js").match(/router\.use\("\/api\/lost-and-found", lostAndFoundRoutes\)/g) || [];
  assert.equal(mounts.length, 1);
});

test("BUG-018 legacy root controller/route/middleware directories are empty", () => {
  for (const dir of ["controllers", "routes", "middleware"]) {
    assert.deepEqual(fs.readdirSync(path.join(serverRoot, dir)), []);
  }
});

test("BUG-019 no active uuid package import remains", () => {
  assert.doesNotMatch(srcText(), /require\(["']uuid["']\)/);
});

test("BUG-020 active src does not instantiate PrismaClient", () => {
  assert.doesNotMatch(srcText(), /new PrismaClient|@prisma\/client|prisma\./);
});

test("BUG-021 job update checks ownership", () => {
  assert.match(read("src/services/jobService.js"), /Unauthorized to update this job/);
});

test("BUG-022 jobs have a protected delete endpoint", () => {
  assert.match(read("src/routes/jobRoutes.js"), /router\.delete\("\/jobs\/:id", authenticateToken/);
  assert.match(read("src/services/jobService.js"), /status: "deleted"/);
});

test("BUG-023 post pagination count uses filtered exact count", () => {
  assert.match(read("src/controllers/postController.js"), /count: "exact"/);
  assert.match(read("src/controllers/postController.js"), /if \(idsFilter\) query = query\.in\("id", idsFilter\)/);
});

test("BUG-024 posts no longer depend on required Prisma Post.category", () => {
  assert.doesNotMatch(read("src/controllers/postController.js"), /Prisma|category\s*String/);
  assert.match(read("src/controllers/postController.js"), /attachCategory/);
});

test("BUG-025 write endpoints use validation helpers", () => {
  assert.match(srcText(), /requiredText|positiveInt|uuid|enumValue/);
});

test("BUG-026 post reactions use upsert instead of check-then-insert", () => {
  assert.match(read("src/controllers/postController.js"), /\.upsert\(/);
  assert.match(read("src/controllers/postController.js"), /onConflict: "post_id,user_id"/);
});

test("BUG-027 profile and cover image responses no longer force image/jpeg", () => {
  assert.doesNotMatch(srcText(), /Content-Type["'],\s*["']image\/jpeg|image\/jpeg["']\)/);
});

test("BUG-028 active database config has no Prisma query logging", () => {
  assert.doesNotMatch(read("src/config/database.js"), /log:\s*\[/);
});

test("BUG-029 email config has no placeholder credential fallbacks", () => {
  assert.doesNotMatch(read("src/config/email.js"), /your-email|your-app-password/);
  assert.match(read("src/config/email.js"), /Email service is not configured/);
});

test("BUG-030 local uploads are not statically served", () => {
  assert.doesNotMatch(read("src/app.js"), /express\.static|\/uploads|\/files/);
});

test("BUG-031 upload error handlers are used by upload routes", () => {
  assert.match(read("src/routes/postRoutes.js"), /imageUploadErrorHandler/);
  assert.match(read("src/routes/academicResourceRoutes.js"), /pdfUploadErrorHandler/);
  assert.match(read("src/routes/userRoutes.js"), /profileImageUploadErrorHandler/);
});

test("BUG-032 malformed JSON returns a standardized 400", async () => {
  const res = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).message, "Malformed JSON request body");
});

test("BUG-033 graceful shutdown handlers are present", () => {
  const server = read("server.js");
  assert.match(server, /process\.on\("SIGINT"/);
  assert.match(server, /process\.on\("SIGTERM"/);
  assert.match(server, /server\.close/);
});

test("BUG-034 active code logs through the logger utility", () => {
  const offenders = walk(srcRoot)
    .filter((file) => file.endsWith(".js") && !file.endsWith(`${path.sep}logger.js`))
    .filter((file) => /console\.(log|warn|error)/.test(fs.readFileSync(file, "utf8")));
  assert.deepEqual(offenders, []);
});

test("BUG-035 uploads verify magic bytes and derive storage extensions safely", () => {
  const { validateUploadedFile } = require("../../src/utils/fileValidation");
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(validateUploadedFile({ buffer: png, mimetype: "image/png" }, { bucket: "avatars" }).extension, ".png");
  assert.throws(
    () => validateUploadedFile({ buffer: Buffer.from("<html>"), mimetype: "image/jpeg" }, { bucket: "avatars" }),
    /content does not match/
  );
});

test("BUG-036 profile and cover upload filenames use normalized req.user.userId", () => {
  assert.match(read("src/controllers/profileController.js"), /const userId = req\.user\.userId/);
});

test("BUG-037 package main points to server.js", () => {
  assert.equal(JSON.parse(read("package.json")).main, "server.js");
});

test("BUG-038 dev script uses nodemon", () => {
  assert.match(JSON.parse(read("package.json")).scripts.dev, /nodemon/);
});

test("BUG-039 backend test script runs real tests", () => {
  assert.doesNotMatch(JSON.parse(read("package.json")).scripts.test, /Error: no test specified/);
});

test("BUG-040 pg-promise is absent", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.dependencies["pg-promise"], undefined);
});

test("BUG-041 confession getUserReactions returns an array consumed by map", () => {
  assert.match(read("src/services/confessionService.js"), /\.select\("reaction_type"\)/);
  assert.match(read("src/services/confessionService.js"), /return data\.map/);
});

test("BUG-042 lost-and-found ownership works with normalized user IDs", () => {
  assert.match(read("src/controllers/lostAndFoundController.js"), /req\.user\.id/);
  assert.match(read("src/middleware/auth.js"), /userId:\s*data\.user\.id/);
  assert.match(read("src/services/lostAndFoundService.js"), /existing\.user_id !== userId/);
});

test("BUG-043 profile updates use a whitelist payload", () => {
  assert.match(read("src/services/userService.js"), /const allowed = \{/);
  assert.match(read("src/services/userService.js"), /profilePayload\(profileData\)/);
});

test("BUG-044 lost-and-found updates use an allowed-field payload", () => {
  assert.match(read("src/services/lostAndFoundService.js"), /allowedUpdateFields/);
});

test("BUG-045 storage paths do not include originalname", () => {
  assert.doesNotMatch(read("src/services/storageService.js"), /originalname/);
  assert.match(read("src/services/storageService.js"), /safeSegment/);
});

test("BUG-046 Cat Q&A delete authorization is enforced", () => {
  assert.match(read("src/services/catQAService.js"), /Unauthorized to delete this question/);
  assert.match(read("src/services/catQAService.js"), /Unauthorized to delete this answer/);
});

test("BUG-047 academic resources check ownership on update/delete", () => {
  const service = read("src/services/academicResourceService.js");
  assert.match(service, /Unauthorized to update this academic resource/);
  assert.match(service, /Unauthorized to delete this academic resource/);
});

test("BUG-048 post reaction count is database-trigger maintained", () => {
  assert.match(read("supabase/migrations/202605280001_supabase_native_schema.sql"), /post_reaction_insert_count/);
  assert.doesNotMatch(read("src/controllers/postController.js"), /reaction_count\s*[-+]/);
});

test("BUG-049 feed null department or batch falls back safely", () => {
  assert.match(read("src/controllers/postController.js"), /if \(!profile\?\.department_id && !profile\?\.batch\)/);
});

test("BUG-050 chat direct conversation lookup uses direct_key uniqueness", () => {
  assert.match(read("src/services/chatService.js"), /directKey/);
  assert.match(read("src/services/chatService.js"), /\.eq\("direct_key", key\)/);
});

test("BUG-051 shared public profile mapper hides email and student identity", () => {
  const { mapProfile } = require("../../src/utils/supabaseData");
  const mapped = mapProfile({
    id: "u1",
    display_name: "N",
    email: "n@example.com",
    student_id: "123",
    role: "admin",
    batch: 20,
    department_id: 1,
    profile_image_path: "avatar.png",
    cover_image_path: "cover.png",
  });
  assert.deepEqual(mapped, {
    id: "u1",
    name: "N",
    profile: { profilePicture: "avatar.png" },
  });
});

test("BUG-052 post routes use the canonical auth middleware", () => {
  assert.match(read("src/routes/postRoutes.js"), /require\("\.\.\/middleware\/auth"\)/);
  assert.doesNotMatch(read("src/routes/postRoutes.js"), /authMiddleware/);
});

test("BUG-053 confession mostReacted and mostVoted sorting are implemented", () => {
  const service = read("src/services/confessionService.js");
  assert.match(service, /sortBy === "mostVoted"/);
  assert.match(service, /reaction_count/);
  assert.match(service, /total_votes/);
});

test("BUG-054 Cat Q&A questions are paginated", () => {
  const service = read("src/services/catQAService.js");
  assert.match(service, /pageRange/);
  assert.match(service, /\.range\(range\.from, range\.to\)/);
});

test("BUG-055 jobs are paginated", () => {
  assert.match(read("src/services/jobService.js"), /\.range\(from, to\)/);
});

test("BUG-056 lost-and-found no longer uses a relative uploadDir", () => {
  assert.doesNotMatch(read("src/controllers/lostAndFoundController.js"), /uploadDir|uploads\/lost-and-found/);
});

test("BUG-057 chat is backed by realtime-ready Supabase tables", () => {
  const migration = read("supabase/migrations/202605280001_supabase_native_schema.sql");
  assert.match(migration, /create table if not exists public\.conversations/);
  assert.match(migration, /create table if not exists public\.chat_messages/);
});

test("BUG-058 stored user content passes through sanitizer helpers", () => {
  assert.match(srcText(), /sanitizePlainText/);
});

test("BUG-059 destructive deleteAllPosts utility is absent", () => {
  assert.equal(exists("src/deleteAllPosts.js"), false);
});

test("BUG-060 lost-and-found route is not double-mounted", () => {
  const index = read("src/routes/index.js");
  assert.equal((index.match(/router\.use\("\/api\/lost-and-found"/g) || []).length, 1);
});

test("BUG-061 response helpers provide a standard error envelope", () => {
  const response = require("../../src/utils/responses");
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
  response.forbidden(res, "Nope");
  assert.deepEqual(res.body, { success: false, message: "Nope" });
});

test("BUG-062 confession controller logs metadata, not raw request bodies", () => {
  const controller = read("src/controllers/confessionController.js");
  assert.doesNotMatch(controller, /console\.log|logger\.(debug|info)\([^)]*req\.body/);
  assert.match(controller, /tagCount/);
});

test("NEW-001 department creation is admin-only", () => {
  assert.match(read("src/routes/academicResourceRoutes.js"), /authenticateToken,\s*requireAdmin,\s*createLimiter/);
});

test("NEW-002 job applicant details require job owner or moderator", () => {
  assert.match(read("src/routes/jobRoutes.js"), /\/jobs\/:jobId\/applications",\s*\n\s*authenticateToken/);
  assert.match(read("src/services/jobApplicationService.js"), /Unauthorized to view job applications/);
});

test("NEW-003 list endpoints added pagination metadata", () => {
  assert.match(read("src/services/lostAndFoundService.js"), /pagination/);
  assert.match(read("src/services/academicResourceService.js"), /pagination/);
  assert.match(read("src/services/chatService.js"), /pagination/);
});

test("NEW-004 vulnerable dependency range was updated", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.match(pkg.dependencies.nodemailer, /^(\^)?8\./);
  assert.match(pkg.dependencies.multer, /^(\^)?2\./);
});

test("NEW-005 production 5xx responses are stripped of internal details", () => {
  const app = read("src/app.js");
  assert.match(app, /sanitizeProductionErrors/);
  assert.match(app, /process\.env\.NODE_ENV === "production" && res\.statusCode >= 500/);
  assert.match(app, /message: "Internal server error"/);
});
