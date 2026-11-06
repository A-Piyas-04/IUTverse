// Loads the published contract (docs/api/openapi.yaml) and validates real handler output against it.
import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import YAML from "yaml";

export const SPEC_PATH = path.resolve(__dirname, "../../docs/api/openapi.yaml");
export const spec: any = YAML.parse(fs.readFileSync(SPEC_PATH, "utf8"));

const METHODS = ["get", "put", "post", "delete", "patch"] as const;

export interface ContractOperation {
  route: string;
  method: string;
  op: any;
}

export const contractOperations = (): ContractOperation[] =>
  Object.entries<any>(spec.paths).flatMap(([route, item]) =>
    METHODS.filter((method) => item[method]).map((method) => ({ route, method: method.toUpperCase(), op: item[method] }))
  );

export const operationById = (operationId: string): ContractOperation => {
  const found = contractOperations().find(({ op }) => op.operationId === operationId);
  if (!found) throw new Error(`Unknown operationId ${operationId}`);
  return found;
};

// OpenAPI 3.0 schemas use `nullable`, which Ajv understands; the extension keywords (x-*) are ignored.
const ajv = new Ajv({ strict: false, allErrors: true, validateSchema: false });
addFormats(ajv);
ajv.addFormat("binary", true);
ajv.addSchema(spec, "contract");

const deref = (node: any): any => {
  let current = node;
  while (current?.$ref) {
    const parts = String(current.$ref).replace(/^#\//, "").split("/").map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
    current = parts.reduce((value, key) => value?.[key], spec);
  }
  return current;
};

const responseSchemaRef = (operationId: string, status: number | string) => {
  const { op } = operationById(operationId);
  const response = deref(op.responses?.[String(status)]);
  if (!response) throw new Error(`${operationId} documents no ${status} response`);
  const schema = response.content?.["application/json"]?.schema;
  if (!schema) throw new Error(`${operationId} ${status} has no JSON schema`);
  if (!schema.$ref) throw new Error(`${operationId} ${status} schema must be a named component`);
  return `contract${schema.$ref}`;
};

const validators = new Map<string, ReturnType<typeof ajv.compile>>();

/** Returns the list of contract violations for a response body (empty when it conforms). */
export const contractViolations = (operationId: string, status: number, body: unknown): string[] => {
  const ref = responseSchemaRef(operationId, status);
  if (!validators.has(ref)) validators.set(ref, ajv.compile({ $ref: ref }));
  const validate = validators.get(ref)!;
  return validate(body) ? [] : (validate.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message}`);
};

export const requestBodyViolations = (operationId: string, body: unknown): string[] => {
  const { op } = operationById(operationId);
  const schema = op.requestBody?.content?.["application/json"]?.schema;
  if (!schema?.$ref) throw new Error(`${operationId} has no named JSON request schema`);
  const ref = `contract${schema.$ref}`;
  if (!validators.has(ref)) validators.set(ref, ajv.compile({ $ref: ref }));
  const validate = validators.get(ref)!;
  return validate(body) ? [] : (validate.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message}`);
};

/**
 * Operations whose real handler output is validated against a 2xx response schema by a conformance test: the ids
 * passed to `conforms("id", ...)` or `contractViolations("id", 200|201, ...)` in tests/server. The contract's
 * `x-contract-status: verified` list must equal this set, so the label cannot be claimed without a test.
 */
export const operationsWithConformanceTests = (): string[] => {
  const dir = path.resolve(__dirname, "../server");
  const found = new Set<string>();
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".test.ts") && name !== "contract-gate.test.ts")) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    for (const match of text.matchAll(/\bconforms\(\s*"([A-Za-z0-9_]+)"/g)) found.add(match[1]!);
    for (const match of text.matchAll(/\bcontractViolations\(\s*"([A-Za-z0-9_]+)"\s*,\s*20\d\s*,/g)) found.add(match[1]!);
  }
  return [...found].sort();
};
