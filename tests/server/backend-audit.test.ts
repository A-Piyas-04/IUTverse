// Regression checks from the backend audit, carried across the Express to
// Next.js move. Behavioral checks run the real proxy and route handlers; the
// structural ones read source text, for properties no request can show (for
// example "nothing logs through console").
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "../helpers/dispatch";
import { validateUploadedFile } from "@/server/utils/fileValidation";
import { mapProfile } from "@/server/utils/supabaseData";
import * as response from "@/server/http/responses";
import { route } from "@/server/http/route";

const root = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file: string) => fs.existsSync(path.join(root, file));

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));

const serverFiles = () => walk(path.join(root, "src/server")).filter((file) => file.endsWith(".ts"));
const apiFiles = () => walk(path.join(root, "src/app/api")).filter((file) => file.endsWith(".ts"));
const srcText = () => [...serverFiles(), ...apiFiles()].map((file) => fs.readFileSync(file, "utf8")).join("\n");

afterEach(() => vi.unstubAllEnvs());

describe("secrets and credentials", () => {
  it("BUG-001 keeps env files out of git and the scanner knows the leaked password", () => {
    const tracked = execFileSync("git", ["ls-files", ".env", "server/.env"], { cwd: root, encoding: "utf8" }).trim();
    expect(tracked).toBe("");
    expect(read("scripts/scanSecrets.js")).toMatch(/known leaked Gmail app password/);
  });

  it("BUG-002/003 signup neither returns nor logs a plaintext password", () => {
    const auth = read("src/server/controllers/authController.ts");
    expect(auth).not.toMatch(/devPassword|password:\s*password/);
    expect(auth).not.toMatch(/console\.log|Password for|password.*logger/i);
  });

  it("BUG-004 signup does not generate weak email-derived passwords", () => {
    expect(read("src/server/utils/authUtils.ts")).not.toMatch(/generatePassword|Math\.random|email.*slice/i);
    expect(read("src/server/controllers/authController.ts")).toMatch(/password\.length < 8/);
  });

  it("BUG-009 has no JWT fallback secret", () => {
    expect(read("src/server/config/config.ts")).not.toMatch(/your-secret-key-change-in-production|jwtSecret:\s*process\.env\.JWT_SECRET\s*\|\|/);
  });

  it("BUG-029 email config has no placeholder credential fallbacks", () => {
    expect(read("src/server/config/email.ts")).not.toMatch(/your-email|your-app-password/);
    expect(read("src/server/config/email.ts")).toMatch(/Email service is not configured/);
  });
});

describe("authentication and authorization", () => {
  it("BUG-005 offers password reset and change", () => {
    expect(exists("src/app/api/auth/password/reset-request/route.ts")).toBe(true);
    expect(read("src/app/api/auth/password/route.ts")).toMatch(/PUT = route\(\[authenticateToken/);
  });

  it("BUG-010 user enumeration requires auth and the admin role", async () => {
    expect((await request("GET", "/api/auth/users")).status).toBe(401);
    expect(read("src/app/api/auth/users/route.ts")).toMatch(/authenticateToken,\s*requireAdmin/);
  });

  it("BUG-011 lost-and-found writes require auth and no userId=1 fallback remains", async () => {
    expect((await request("POST", "/api/lost-and-found")).status).toBe(401);
    expect(read("src/server/controllers/lostAndFoundController.ts")).not.toMatch(/userId\s*=\s*1/);
  });

  it("BUG-012/013 cat posts and Cat Q&A creation require auth", async () => {
    expect((await request("POST", "/api/cat-posts")).status).toBe(401);
    expect((await request("POST", "/api/cat-qa/questions")).status).toBe(401);
    expect(read("src/app/api/cat-qa/questions/route.ts")).toMatch(/POST = route\(\[authenticateToken/);
  });

  it("BUG-015/016 has one auth middleware that normalizes req.user.id and userId", () => {
    const auth = read("src/server/middleware/auth.ts");
    expect(auth).toMatch(/authenticateToken/);
    expect(auth).toMatch(/id:\s*data\.user\.id/);
    expect(auth).toMatch(/userId:\s*data\.user\.id/);
    expect(auth).not.toMatch(/jwt\.verify|jsonwebtoken/);
    expect(exists("src/server/middleware/authMiddleware.ts")).toBe(false);
  });

  it("BUG-042 lost-and-found ownership works with normalized user IDs", () => {
    expect(read("src/server/controllers/lostAndFoundController.ts")).toMatch(/ctx\.user!\.id/);
    expect(read("src/server/services/lostAndFoundService.ts")).toMatch(/existing\.user_id !== userId/);
  });

  it("BUG-052 post routes use the canonical auth step", () => {
    for (const file of ["src/app/api/posts/route.ts", "src/app/api/posts/[id]/route.ts", "src/app/api/feed/route.ts"]) {
      expect(read(file), file).toMatch(/authenticateToken/);
    }
  });

  it("NEW-001 department creation is admin-only", () => {
    expect(read("src/app/api/academic/departments/route.ts")).toMatch(/authenticateToken,\s*requireAdmin,\s*createLimiter/);
  });

  it("NEW-002 job applicant details require the job owner or a moderator", () => {
    expect(read("src/app/api/jobs/[id]/applications/route.ts")).toMatch(/GET = route\(\[authenticateToken\]/);
    expect(read("src/server/services/jobApplicationService.ts")).toMatch(/Unauthorized to view job applications/);
  });
});

describe("transport hardening", () => {
  it("BUG-006 CORS rejects unapproved browser origins", async () => {
    const res = await request("GET", "/api/health", { headers: { Origin: "https://evil.example" } });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("BUG-007 limiters are wired on the credential and write routes", () => {
    expect(read("src/server/http/route.ts")).toMatch(/apiLimiter/);
    expect(read("src/app/api/auth/login/route.ts")).toMatch(/authLimiter/);
    expect(read("src/app/api/posts/route.ts")).toMatch(/createLimiter/);
    expect(read("src/app/api/user/student-id/check/[studentId]/route.ts")).toMatch(/lookupLimiter/);
  });

  it("BUG-014 oversized JSON returns 413 instead of an unhandled 500", async () => {
    const res = await request("POST", "/api/auth/login", { body: { email: "x@iut-dhaka.edu", password: "a".repeat(1024 * 1024 + 1) } });
    expect(res.status).toBe(413);
    expect(res.body.message).toBe("Request body too large");
  });

  it("BUG-032 malformed JSON returns a standardized 400", async () => {
    const res = await request("POST", "/api/auth/login", { raw: "{" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Malformed JSON request body");
  });

  it("NEW-005 strips internal details from 5xx responses unless opted in", async () => {
    // Handlers that answer { message, error } directly still go through the pipeline.
    const leaky = route([], () => Response.json({ message: "Error creating profile", error: "duplicate key value violates unique constraint" }, { status: 500 }));
    const res = await leaky(new NextRequest("http://localhost:3000/api/x"), { params: Promise.resolve({}) });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, message: "Internal server error" });
  });

  it("BUG-061 response helpers provide a standard error envelope", async () => {
    expect(await response.forbidden("Nope").json()).toEqual({ success: false, message: "Nope" });
  });
});

describe("uploads", () => {
  it("BUG-030 local uploads are not statically served", () => {
    expect(exists("public/uploads")).toBe(false);
    expect(read("next.config.ts")).not.toMatch(/\/uploads|\/files/);
  });

  it("BUG-035 uploads verify magic bytes and derive storage extensions safely", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateUploadedFile({ buffer: png, mimetype: "image/png" }, { bucket: "avatars" })?.extension).toBe(".png");
    expect(() => validateUploadedFile({ buffer: Buffer.from("<html>"), mimetype: "image/jpeg" }, { bucket: "avatars" })).toThrow(/content does not match/);
  });

  it("BUG-027 profile and cover image responses no longer force image/jpeg", () => {
    expect(srcText()).not.toMatch(/Content-Type["'],\s*["']image\/jpeg|image\/jpeg["']\)/);
  });

  it("BUG-036 profile and cover uploads use the normalized userId", () => {
    expect(read("src/server/controllers/profileController.ts")).toMatch(/const userId = ctx\.user!\.userId/);
  });

  it("BUG-045 storage paths do not include the original file name", () => {
    expect(read("src/server/services/storageService.ts")).not.toMatch(/originalname/);
    expect(read("src/server/services/storageService.ts")).toMatch(/safeSegment/);
  });

  it("BUG-031 upload routes use multipart steps with the right limits", () => {
    expect(read("src/server/http/uploads.ts")).toMatch(/maxBytes: 2 \* MB/);
    expect(read("src/app/api/academic/resources/route.ts")).toMatch(/pdfUpload\(\)/);
    expect(read("src/app/api/profile/upload-picture/route.ts")).toMatch(/profilePictureUpload\(\)/);
    expect(read("src/app/api/posts/route.ts")).toMatch(/imageUpload\(\)/);
  });
});

describe("dependencies and hygiene", () => {
  it("BUG-019/020 uses neither the uuid package nor Prisma", () => {
    expect(srcText()).not.toMatch(/from ["']uuid["']|require\(["']uuid["']\)/);
    expect(srcText()).not.toMatch(/new PrismaClient|@prisma\/client|prisma\./);
  });

  it("BUG-034 server code logs through the logger utility", () => {
    const offenders = serverFiles()
      .filter((file) => !file.endsWith(`${path.sep}logger.ts`))
      .filter((file) => /console\.(log|warn|error)/.test(fs.readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("BUG-039/040 runs real tests and has no pg-promise", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts.test).not.toMatch(/no test specified/);
    expect(pkg.dependencies["pg-promise"]).toBeUndefined();
  });

  it("NEW-004 uses patched mail code and no longer ships the Express stack", () => {
    const pkg = JSON.parse(read("package.json"));
    // nodemailer <=10.0.5 has a reachable addressparser DoS (replyTo on issue reports).
    expect(pkg.dependencies.nodemailer).toMatch(/^(\^)?(1\d|[2-9]\d)\./);
    for (const retired of ["express", "multer", "cors", "helmet", "express-rate-limit", "rate-limit-redis", "bcrypt", "jsonwebtoken", "dotenv"]) {
      expect(pkg.dependencies[retired], retired).toBeUndefined();
    }
  });

  it("BUG-059 has no destructive deleteAllPosts utility", () => {
    expect(srcText()).not.toMatch(/deleteAllPosts/);
  });

  it("leaves no pre-Next.js client or server directories tracked", () => {
    const tracked = execFileSync("git", ["ls-files", "client", "server"], { cwd: root, encoding: "utf8" }).trim();
    expect(tracked).toBe("");
  });
});

describe("data handling", () => {
  it("BUG-021 job update checks ownership", () => {
    expect(read("src/server/services/jobService.ts")).toMatch(/Unauthorized to update this job/);
  });

  it("BUG-022 jobs have a protected delete endpoint that soft-deletes", () => {
    expect(read("src/app/api/jobs/[id]/route.ts")).toMatch(/DELETE = route\(\[authenticateToken/);
    expect(read("src/server/services/jobService.ts")).toMatch(/status: "deleted"/);
  });

  it("BUG-023/024/026 post pagination counts the filtered set; categories and reactions upsert", () => {
    const posts = read("src/server/controllers/postController.ts");
    expect(posts).toMatch(/count: "exact"/);
    expect(posts).toMatch(/if \(idsFilter\) query = query\.in\("id", idsFilter\)/);
    expect(posts).not.toMatch(/Prisma|category\s*String/);
    expect(posts).toMatch(/attachCategory/);
    expect(posts).toMatch(/\.upsert\(/);
    expect(posts).toMatch(/onConflict: "post_id,user_id"/);
  });

  it("BUG-041 confession getUserReactions returns an array consumed by map", () => {
    const service = read("src/server/services/confessionService.ts");
    expect(service).toMatch(/\.select\("reaction_type"\)/);
    expect(service).toMatch(/return \(data as any\[\]\)\.map/);
  });

  it("BUG-043/044 profile and lost-and-found updates use whitelisted payloads", () => {
    const users = read("src/server/services/userService.ts");
    expect(users).toMatch(/const publicPayload =/);
    expect(users).toMatch(/const privatePayload =/);
    expect(users).not.toMatch(/role:\s*"role"/);
    expect(users).not.toMatch(/badges:\s*"badges"/);
    expect(read("src/server/services/lostAndFoundService.ts")).toMatch(/allowedUpdateFields/);
  });

  it("BUG-046/047 Cat Q&A and academic resources enforce ownership", () => {
    const qa = read("src/server/services/catQAService.ts");
    expect(qa).toMatch(/Unauthorized to delete this question/);
    expect(qa).toMatch(/Unauthorized to delete this answer/);
    const resources = read("src/server/services/academicResourceService.ts");
    expect(resources).toMatch(/Unauthorized to update this academic resource/);
    expect(resources).toMatch(/Unauthorized to delete this academic resource/);
  });

  it("BUG-048 the post reaction count is maintained by a database trigger", () => {
    expect(read("supabase/migrations/202605280001_supabase_native_schema.sql")).toMatch(/post_reaction_insert_count/);
    expect(read("src/server/controllers/postController.ts")).not.toMatch(/reaction_count\s*[-+]/);
  });

  it("BUG-049 the feed falls back safely without a department or batch", () => {
    expect(read("src/server/controllers/postController.ts")).toMatch(/if \(!profile\?\.department_id && !profile\?\.batch\)/);
  });

  it("BUG-050 direct conversations are looked up by direct_key", () => {
    const chat = read("src/server/services/chatService.ts");
    expect(chat).toMatch(/directKey/);
    expect(chat).toMatch(/\.eq\("direct_key", key\)/);
  });

  it("BUG-051 the shared public profile mapper hides email and student identity", () => {
    const mapped = mapProfile({
      id: "u1", display_name: "N", email: "n@example.com", student_id: "123", role: "admin",
      batch: 20, department_id: 1, profile_image_path: "avatar.png", cover_image_path: "cover.png",
    })!;
    expect(mapped.id).toBe("u1");
    expect(mapped.displayName).toBe("N");
    expect(mapped.batch).toBe(20);
    expect(mapped.profilePictureUrl).toMatch(/\/avatars\/avatar[.]png$/);
    expect(mapped).not.toHaveProperty("email");
    expect(mapped).not.toHaveProperty("studentId");
    expect(mapped).not.toHaveProperty("role");
  });

  it("BUG-053/054/055 confession sorting and pagination are implemented", () => {
    const confessions = read("src/server/services/confessionService.ts");
    expect(confessions).toMatch(/sortBy === "mostVoted"/);
    expect(confessions).toMatch(/reaction_count/);
    expect(confessions).toMatch(/total_votes/);
    expect(read("src/server/services/catQAService.ts")).toMatch(/\.range\(range\.from, range\.to\)/);
    expect(read("src/server/services/jobService.ts")).toMatch(/\.range\(from, to\)/);
  });

  it("BUG-057 chat is backed by realtime-ready Supabase tables", () => {
    const migration = read("supabase/migrations/202605280001_supabase_native_schema.sql");
    expect(migration).toMatch(/create table if not exists public\.conversations/);
    expect(migration).toMatch(/create table if not exists public\.chat_messages/);
  });

  it("BUG-058 stored user content passes through sanitizer helpers", () => {
    expect(srcText()).toMatch(/sanitizePlainText/);
  });

  it("BUG-062 the confession controller logs metadata, not request bodies", () => {
    const controller = read("src/server/controllers/confessionController.ts");
    expect(controller).not.toMatch(/console\.log|logger\.(debug|info)\([^)]*ctx\.body\b(?!\?)/);
    expect(controller).toMatch(/tagCount/);
  });

  it("NEW-003 list endpoints return pagination metadata", () => {
    for (const file of ["lostAndFoundService", "academicResourceService", "chatService"]) {
      expect(read(`src/server/services/${file}.ts`), file).toMatch(/pagination/);
    }
  });
});
