// Structural checks that the linter does not cover. Fails with a list of problems.
//   node scripts/contract/check.mjs
import { authOf, loadSpec, operations, readSpecText } from "./spec.mjs";

const PRIORITIES = new Set(["P0", "P1", "other"]);
const STATUSES = new Set(["verified", "reviewed", "inferred"]);
const SEMVER = /^\d+\.\d+\.\d+$/;
const OPERATION_ID = /^[a-z][A-Za-z0-9]*_[A-Za-z0-9]+$/;

const spec = loadSpec();
const problems = [];
const fail = (message) => problems.push(message);

if (!String(spec.openapi).startsWith("3.0.")) fail(`openapi must be 3.0.x, found ${spec.openapi}`);
if (!SEMVER.test(spec.info?.version ?? "")) fail(`info.version must be MAJOR.MINOR.PATCH, found ${spec.info?.version}`);
if (!spec.components?.securitySchemes?.bearerAuth) fail("components.securitySchemes.bearerAuth is missing");

const ids = new Map();
for (const { route, method, op } of operations(spec)) {
  const where = `${method} ${route}`;
  if (!OPERATION_ID.test(op.operationId ?? "")) fail(`${where}: operationId "${op.operationId}" must look like domain_action`);
  if (ids.has(op.operationId)) fail(`${where}: duplicate operationId ${op.operationId} (also ${ids.get(op.operationId)})`);
  ids.set(op.operationId, where);
  if (!op.tags?.length) fail(`${where}: no tag`);
  if (!PRIORITIES.has(op["x-priority"])) fail(`${where}: x-priority must be one of ${[...PRIORITIES]}`);
  if (!STATUSES.has(op["x-contract-status"])) fail(`${where}: x-contract-status must be one of ${[...STATUSES]}`);
  if (!op["x-source"]) fail(`${where}: x-source (route file) is missing`);
  if (!Array.isArray(op.security)) fail(`${where}: security must be declared explicitly (use [] for public operations)`);

  const codes = Object.keys(op.responses ?? {});
  if (!codes.some((code) => /^[23]/.test(code))) fail(`${where}: needs a 2xx or 3xx response`);
  if (authOf(op) === "required") {
    for (const code of ["401", "403"]) if (!codes.includes(code)) fail(`${where}: bearer-protected but no ${code} response`);
  }
  if (route !== "/api/health" && !codes.includes("429")) fail(`${where}: rate-limited route without a 429 response`);
  if (route === "/api/health" && authOf(op) !== "none") fail(`${where}: health must be public`);
}

// The contract is public. Make sure nothing that looks like a credential slipped into an example.
const text = readSpecText();
const SECRET_PATTERNS = [
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, "a JWT"],
  [/sb_secret_[A-Za-z0-9_-]+/, "a Supabase secret key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key"],
  [/postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@/, "a database URL with credentials"],
];
for (const [pattern, label] of SECRET_PATTERNS) if (pattern.test(text)) fail(`the spec contains what looks like ${label}`);

if (problems.length) {
  console.error(`Contract check failed (${problems.length}):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`contract check passed: ${ids.size} operations, version ${spec.info.version}`);
