# API contract

`docs/api/openapi.yaml` is the machine-readable contract of the IUTverse HTTP API (`/api/*`). The web client and the
[IUTverse mobile app](https://github.com/NFahmid/iutverse-mobile) build against it. This page explains how it is made, checked and published.

| File | What it is |
|---|---|
| `openapi.yaml` | **Generated** bundle of `src/`. The published artifact. Never edit by hand. |
| `src/openapi.src.yaml`, `src/paths/*.yaml`, `src/components/*.yaml` | **Hand-maintained** sources: info, paths per area, shared schemas, responses, parameters. |
| `endpoint-inventory.md` | **Generated** table of every operation (priority, auth, request kind, status, source file). |
| `conventions.md` | Envelopes, errors, identifiers, timestamps, nullability, pagination, request ids. |
| `compatibility-policy.md` | Versioning, supported window, deprecation. |
| `realtime.md` | Supabase Realtime usage (not expressible in OpenAPI). |
| `idempotency.md` | The optional `Idempotency-Key` header for retry-safe creates. |
| `redocly.yaml` | Lint rules. |

Mobile-specific guides: [`docs/mobile-integration/`](../mobile-integration/auth.md) (auth, [transport](../mobile-integration/transport.md), [uploads](../mobile-integration/uploads.md), [media](../mobile-integration/media.md)).

## Schema strategy: hand-maintained sources, guarded by tests

The server has no authoritative schema layer: handlers validate input by hand (`src/server/utils/validation.ts`) and build
responses ad hoc, and the client DTOs in `src/lib/types.ts` are hand-written TypeScript. Generating the contract from code
would mean introducing a schema library across about 130 handlers, which risks runtime behavior for no user benefit.
Instead the contract is authored in YAML and **kept honest by tests**:

* `tests/server/contract-surface.test.ts`: the documented operations equal the exported route handlers; each operation points
  at its route file; the declared authentication and required roles equal what the route pipeline enforces; every protected
  operation answers 401 with a code to an anonymous caller.
* `tests/server/contract-responses.test.ts`: real handlers (Supabase stubbed) run through `proxy.ts` and the route pipeline,
  and the responses are validated against the schemas (Ajv). The operations covered are exactly those marked
  `x-contract-status: verified`; a test keeps the two lists equal.
* `tests/server/contract-gate.test.ts`: the version rules and structural checks.

Every operation carries:

* `x-priority`: `P0` (mobile foundation), `P1` (feature parity), `other` (admin, web-only credential flows, stubs).
* `x-contract-status`: `verified` (response checked by a conformance test), `reviewed` (schema derived by reading the handler),
  `inferred` (status codes and field names scanned from the handler; bodies are loose `additionalProperties` objects).
  **Promote an operation to `verified` by adding a conformance test, not by editing the label.**
* `x-source`: the route file and handler.

New code can use a schema library per route later; the contract format does not depend on it.

## Commands

| Command | Purpose |
|---|---|
| `npm run contract:lint` | Lint the sources with Redocly (`redocly.yaml`). |
| `npm run contract:build` | Bundle `src/` into `openapi.yaml` and regenerate `endpoint-inventory.md`. Run after any edit to `src/`. |
| `npm run contract:check` | CI gate: lint, bundle is current, structural checks (`scripts/contract/check.mjs`), inventory is current. |
| `npm run contract:gate -- --baseline <file>` | Version rules against a published contract (see below). |
| `npm run contract:package` | Builds `dist/contract/` (`openapi.yaml`, `openapi.yaml.sha256`, `contract-metadata.json`). |

## Changing the API

1. Change the route or handler.
2. Edit the matching files in `docs/api/src/` (add the path item, schemas, error responses).
3. `npm run contract:build`, then `npm test`.
4. Decide the version bump in `src/openapi.src.yaml` (`info.version`): additions are MINOR, documentation-only fixes are PATCH,
   removals or incompatible changes are MAJOR and follow [compatibility-policy.md](compatibility-policy.md).
5. Open the PR. CI (`.github/workflows/contract.yml`) validates, checks compatibility with the last published contract and
   fails on drift.

## Publication and retrieval

* A contract version is published by pushing a tag `api-contract-vX.Y.Z` where `X.Y.Z` equals `info.version` and the commit is on
  `development` or `production`. The `publish` job creates a GitHub Release with three assets:
  `openapi.yaml`, `openapi.yaml.sha256`, `contract-metadata.json` (version, source commit, sha256, operation count).
* Releases are immutable by rule: the job fails if the release exists, and the gate fails when the content changes under an
  already published version.
* The repository is public, so assets download without credentials:
  `https://github.com/A-Piyas-04/IUTverse/releases/download/api-contract-v1.0.0/openapi.yaml`.
  If the repository ever becomes private, consumers need a fine-grained token with read access to **Contents** of this repository only.
* A temporary Actions artifact is deliberately not used: artifacts expire and need authentication.

## CI behavior (`.github/workflows/contract.yml`)

| Job | When | What |
|---|---|---|
| `validate` | every PR and push | `contract:check` and the three contract test files. No secrets. |
| `compatibility` | after `validate` | Downloads the latest **published** contract (not a branch), verifies its checksum, runs the version gate, and runs **oasdiff** breaking-change detection unless the version carries a MAJOR bump. Before the first release there is no baseline and the job says so. |
| `publish` | tag `api-contract-v*` only | Checks the tag equals `info.version`, runs checks, creates the release. The only job with `contents: write`. |

Limits to know: compatibility is checked against the latest published contract only. Checking every version inside the support
window needs a list of supported versions and is a follow-up. The first release (`api-contract-v1.0.0`) has to be cut by
a maintainer; until then PRs are validated but not diffed.

## Known limitations of contract 1.0.0

* All 130 operations are documented (path, method, operationId, authentication, role, parameters, body field names, status codes, uploads).
  Body schemas are detailed for the P0 set and a few P1 operations (chat send and attachments, academic file): 19 operations are `verified`,
  11 `reviewed`; the other 100 are `inferred`, meaning their bodies are open objects (see [endpoint-inventory.md](endpoint-inventory.md)).
* Response shapes are documented as they are, including bare bodies and route-specific envelopes; they are not unified (see
  [conventions.md](conventions.md)). Unifying them is a versioned migration, not part of 1.0.0.
* Pagination metadata keys differ per endpoint.
* Realtime events and the Supabase Auth API are outside this document (see [realtime.md](realtime.md) and
  [../mobile-integration/auth.md](../mobile-integration/auth.md)).
* There are no notification endpoints; the plan's notification outbox does not exist yet.
