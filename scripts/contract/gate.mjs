// Version gate between a published baseline contract and the current one. It enforces the rules that a
// structural diff tool cannot:
//   * a published version is immutable: same version + different content is an error;
//   * versions never go backwards;
//   * removing an operation needs a MAJOR bump, adding one needs at least a MINOR bump.
// It also reports whether breaking changes are allowed (MAJOR bump), which the CI diff step (oasdiff) uses.
//
//   node scripts/contract/gate.mjs --baseline path/to/published/openapi.yaml [--current docs/api/openapi.yaml]
//
// Exit 0 = acceptable, 1 = rule violated. Prints `breaking-allowed=true|false`, also appended to $GITHUB_OUTPUT.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { HTTP_METHODS, root, specPath } from "./spec.mjs";

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const baselinePath = flag("--baseline");
const currentPath = flag("--current") ? path.resolve(flag("--current")) : specPath;
if (!baselinePath) {
  console.error("usage: node scripts/contract/gate.mjs --baseline <published openapi.yaml> [--current <openapi.yaml>]");
  process.exit(2);
}

const read = (file) => fs.readFileSync(path.resolve(root, file), "utf8").replace(/\r\n/g, "\n");
const baselineText = read(baselinePath);
const currentText = read(currentPath);
const baseline = YAML.parse(baselineText);
const current = YAML.parse(currentText);

const parse = (version) => String(version).split(".").map(Number);
const [bMajor, bMinor, bPatch] = parse(baseline.info.version);
const [cMajor, cMinor, cPatch] = parse(current.info.version);
const compare = (cMajor - bMajor) || (cMinor - bMinor) || (cPatch - bPatch);
const bump = cMajor > bMajor ? "major" : cMinor > bMinor ? "minor" : cPatch > bPatch ? "patch" : "none";

const keys = (spec) =>
  new Set(Object.entries(spec.paths).flatMap(([route, item]) => HTTP_METHODS.filter((m) => item[m]).map((m) => `${m.toUpperCase()} ${route}`)));
const before = keys(baseline);
const after = keys(current);
const removed = [...before].filter((key) => !after.has(key));
const added = [...after].filter((key) => !before.has(key));

const problems = [];
if (compare < 0) problems.push(`info.version went backwards: ${baseline.info.version} -> ${current.info.version}`);
if (compare === 0 && baselineText !== currentText) {
  problems.push(`the contract changed but info.version is still ${current.info.version}; published versions are immutable, bump the version`);
}
if (removed.length && bump !== "major") problems.push(`operations removed without a MAJOR bump: ${removed.join(", ")}`);
if (added.length && !["major", "minor"].includes(bump)) problems.push(`operations added without at least a MINOR bump: ${added.join(", ")}`);

const breakingAllowed = bump === "major";
console.log(`baseline ${baseline.info.version} -> current ${current.info.version} (${bump}); +${added.length} -${removed.length} operations`);
console.log(`breaking-allowed=${breakingAllowed}`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `breaking-allowed=${breakingAllowed}\n`);

if (problems.length) {
  console.error(`Contract gate failed:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
