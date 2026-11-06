// Offline tests for the contract tooling: the version gate and the structural check, run as the CI runs them.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import YAML from "yaml";
import { SPEC_PATH, spec } from "../helpers/contract";

const root = path.resolve(__dirname, "../..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contract-gate-"));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const write = (name: string, doc: any) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, YAML.stringify(doc));
  return file;
};
const clone = () => structuredClone(spec);
const gate = (baseline: string, current: string) =>
  spawnSync(process.execPath, [path.join(root, "scripts/contract/gate.mjs"), "--baseline", baseline, "--current", current], { encoding: "utf8" });

describe("contract version gate", () => {
  it("accepts an unchanged contract", () => {
    const result = gate(SPEC_PATH, SPEC_PATH);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("breaking-allowed=false");
  });

  it("rejects a changed contract that keeps its published version", () => {
    const changed = clone();
    changed.paths["/api/health"].get.summary = "Edited";
    const result = gate(SPEC_PATH, write("same-version.yaml", changed));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("immutable");
  });

  it("rejects a version that goes backwards", () => {
    const older = clone();
    older.info.version = "0.9.0";
    expect(gate(SPEC_PATH, write("older.yaml", older)).status).toBe(1);
  });

  it("requires a MAJOR bump to remove an operation", () => {
    const removed = clone();
    delete removed.paths["/api/health"];
    removed.info.version = "1.1.0";
    const minor = gate(SPEC_PATH, write("removed-minor.yaml", removed));
    expect(minor.status).toBe(1);
    expect(minor.stderr).toContain("removed without a MAJOR bump");

    removed.info.version = "2.0.0";
    const major = gate(SPEC_PATH, write("removed-major.yaml", removed));
    expect(major.status).toBe(0);
    expect(major.stdout).toContain("breaking-allowed=true");
  });

  it("requires at least a MINOR bump to add an operation", () => {
    const baseline = clone();
    delete baseline.paths["/api/health"];
    const patch = clone();
    patch.info.version = "1.0.1";
    expect(gate(write("without-health.yaml", baseline), write("added-patch.yaml", patch)).status).toBe(1);
    patch.info.version = "1.1.0";
    expect(gate(write("without-health2.yaml", baseline), write("added-minor.yaml", patch)).status).toBe(0);
  });
});

describe("contract structural check", () => {
  it("passes on the committed contract", () => {
    const out = execFileSync(process.execPath, [path.join(root, "scripts/contract/check.mjs")], { encoding: "utf8" });
    expect(out).toContain("contract check passed");
  });

  it("has a version, a bearer scheme and no operation without explicit security", () => {
    expect(spec.components.securitySchemes.bearerAuth).toMatchObject({ type: "http", scheme: "bearer" });
    for (const item of Object.values<any>(spec.paths)) {
      for (const [method, op] of Object.entries<any>(item)) {
        if (["get", "post", "put", "patch", "delete"].includes(method)) expect(Array.isArray(op.security), op.operationId).toBe(true);
      }
    }
  });
});
