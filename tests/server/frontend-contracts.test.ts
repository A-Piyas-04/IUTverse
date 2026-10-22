import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("frontend contracts", () => {
  it("V2 persistence migration includes saves, reports, issue reports and private attachments", () => {
    const sql = read("supabase/migrations/202606300001_frontend_v2_features.sql");
    for (const table of ["saved_items", "content_reports", "issue_reports", "conversation_contexts", "academic_resource_feedback"]) {
      expect(sql).toMatch(new RegExp(`create table if not exists public\\.${table}`));
    }
    expect(sql).toMatch(/'chat-attachments', 'chat-attachments', false/);
  });

  it("V2 write endpoints require canonical authentication", () => {
    expect(read("src/app/api/saved-items/[kind]/[id]/route.ts")).toMatch(/POST = route\(\[authenticateToken/);
    expect(read("src/app/api/reports/route.ts")).toMatch(/POST = route\(\[authenticateToken/);
    expect(read("src/app/api/events/route.ts")).toMatch(/POST = route\(\[authenticateToken/);
    expect(read("src/app/api/issue-reports/route.ts")).toMatch(/POST = route\(\[authenticateToken/);
  });

  it("serves chat attachments through participant-authorized signed URLs", () => {
    expect(read("src/app/api/chat/attachments/[messageId]/route.ts")).toMatch(/GET = route\(\[authenticateToken\]/);
    expect(read("src/server/services/chatService.ts")).toMatch(/isParticipant\(data\.conversation_id, userId\)/);
    expect(read("src/server/controllers/chatController.ts")).toMatch(/storageService\.signedUrl/);
  });

  it("exposes post reaction summaries while anonymous identity stays protected", () => {
    const controller = read("src/server/controllers/postController.ts");
    expect(controller).toMatch(/reactionSummary/);
    expect(controller).toMatch(/reactionCount:/);
    expect(controller).toMatch(/currentReaction:/);
    expect(controller).toMatch(/authorId: anonymous \? null : post\.author_id/);
    expect(read("src/app/api/posts/route.ts")).toMatch(/GET = route\(\[authenticateToken\]/);
    expect(read("src/app/api/posts/[id]/route.ts")).toMatch(/GET = route\(\[authenticateToken\]/);
  });

  it("calls the API the way the server reads it (client and server agree on paths)", () => {
    // Every literal /api path the client builds must resolve to a route file.
    const clientFiles = ["src/views", "src/features", "src/components", "src/lib"]
      .flatMap((dir) => fs.readdirSync(path.join(root, dir), { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name))
      .map((entry) => fs.readFileSync(path.join(entry.parentPath, entry.name), "utf8"))
      .join("\n");
    const paths = new Set<string>();
    for (const match of clientFiles.matchAll(/(?:apiRequest|apiPage)(?:<[^>(]*>)?\(\s*([`"'])(\/[^`"']*)\1/g)) {
      const clientPath = match[2]
        .replace(/\$\{queryString\(.*?\)\}/g, "") // query strings are not part of the route
        .replace(/\$\{[^}]*\}/g, "1")
        .split("?")[0]
        .replace(/\/$/, "");
      if (!clientPath.endsWith("-")) paths.add(clientPath); // a prefix that is completed at runtime
    }
    expect(paths.size).toBeGreaterThan(25);

    const patterns = walkRoutes().map((route) => new RegExp(`^${route.replace(/\[[A-Za-z]+\]/g, "[^/]+")}$`));
    const unmatched = [...paths].filter((clientPath) => !patterns.some((pattern) => pattern.test(`/api${clientPath}`)));
    expect(unmatched).toEqual([]);
  });
});

function walkRoutes(): string[] {
  const base = path.join(root, "src/app/api");
  return fs
    .readdirSync(base, { recursive: true })
    .map(String)
    .filter((file) => path.basename(file) === "route.ts")
    .map((file) => `/api/${path.dirname(file).split(path.sep).join("/")}`.replace(/\/\.$/, ""));
}
