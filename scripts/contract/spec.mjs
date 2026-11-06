// Shared helpers for the contract scripts: load the bundled spec and iterate its operations.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const specPath = path.join(root, "docs/api/openapi.yaml");
export const HTTP_METHODS = ["get", "put", "post", "delete", "patch", "options", "head"];

export const readSpecText = () => fs.readFileSync(specPath, "utf8").replace(/\r\n/g, "\n");
export const loadSpec = () => YAML.parse(readSpecText());

export const operations = (spec) =>
  Object.entries(spec.paths).flatMap(([route, item]) =>
    HTTP_METHODS.filter((method) => item[method]).map((method) => ({ route, method: method.toUpperCase(), op: item[method] }))
  );

/** Bearer requirement: "required", "optional" (anonymous allowed) or "none". */
export const authOf = (op) => {
  const security = op.security ?? [];
  if (!security.length) return "none";
  return security.some((entry) => Object.keys(entry).length === 0) ? "optional" : "required";
};
