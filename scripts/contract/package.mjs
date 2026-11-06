// Assembles the publishable contract bundle in dist/contract:
//   openapi.yaml            the contract (copy of docs/api/openapi.yaml)
//   openapi.yaml.sha256     "<sha256>  openapi.yaml" (sha256sum format)
//   contract-metadata.json  version, source commit and checksum
//
// The source commit comes from GITHUB_SHA in CI, otherwise from `git rev-parse HEAD`.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadSpec, operations, readSpecText, root } from "./spec.mjs";

const outDir = path.join(root, "dist/contract");
fs.mkdirSync(outDir, { recursive: true });

const text = readSpecText();
const sha256 = crypto.createHash("sha256").update(text).digest("hex");
const spec = loadSpec();
const commit = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

const metadata = {
  contract: "iutverse-api",
  version: spec.info.version,
  openapi: spec.openapi,
  sourceRepository: process.env.GITHUB_REPOSITORY || "A-Piyas-04/IUTverse",
  sourceCommit: commit,
  tag: `api-contract-v${spec.info.version}`,
  file: "openapi.yaml",
  sha256,
  operations: operations(spec).length,
};

fs.writeFileSync(path.join(outDir, "openapi.yaml"), text);
fs.writeFileSync(path.join(outDir, "openapi.yaml.sha256"), `${sha256}  openapi.yaml\n`);
fs.writeFileSync(path.join(outDir, "contract-metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify(metadata, null, 2));
