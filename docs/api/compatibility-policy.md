# API compatibility policy

Installed mobile apps cannot be updated on demand, so the backend must keep working for every supported app version. This is the
canonical copy; the mobile repository links here. The numbers are **proposed defaults** until the maintainers confirm them (gate G0).

## 1. Contract versions

* `info.version` in `docs/api/src/openapi.src.yaml` is semantic: **MAJOR** breaking, **MINOR** backward-compatible addition,
  **PATCH** documentation or description fix with no wire change.
* A version is published once, as the tag and release `api-contract-vX.Y.Z` ([README](README.md#publication-and-retrieval)).
  A published version is immutable; `npm run contract:gate` and CI fail when content changes under an existing version.
* Mobile pins one exact version and the backend commit it came from, and upgrades by pull request.

## 2. What is breaking

Needs a MAJOR bump and the deprecation process:

* Removing or renaming an operation, field, enum value or query parameter.
* Changing a type, format, nullability or meaning of a field (including timestamp zone or precision).
* Making an optional request field required, or rejecting values that used to be valid.
* Changing authentication, authorization requirements or status-code semantics of an operation.
* Changing pagination, identifier format or default sort order.
* Changing an envelope or error shape.

Not breaking (MINOR): new operations, new optional request fields, new response fields, new enum values (clients must treat
unknown enum values as unknown), new optional error `code` values.

CI enforces what a tool can see: `oasdiff breaking` against the last published contract fails unless the version has a MAJOR
bump; the gate fails removals without MAJOR and additions without at least MINOR.

## 3. URL versioning

Routes live under `/api`. `/api/v1` is introduced only when a breaking change cannot be made additively; then the old routes stay for
the full support window below. The contract version and the URL prefix are independent.

## 4. Supported app versions (proposed)

* The backend supports every mobile release published in the last **90 days** and always the last **two minor releases**,
  whichever set is larger.
* A server-side minimum supported version per platform (location to be decided in Phase 1.2) drives a blocking "update required"
  screen only below it, and a soft prompt for old supported versions.
* `X-Client-Platform` and `X-Client-Version` are diagnostic. They are never used for authorization.

## 5. Deprecation process

1. Mark the field/operation `deprecated: true` in the contract and add `Deprecation` and `Sunset` response headers.
2. Ship the replacement first; at least two mobile releases must contain the migration.
3. Wait at least **90 days** after the first mobile release that stopped using the old shape.
4. Verify from request logs (grouped by client version, once logged) that supported versions no longer call it, or usage is under 2 percent.
5. Remove in a MAJOR contract version; the PR links the evidence.

Security fixes may shorten the window; notify the mobile owner immediately and use the minimum supported version if needed.

## 6. Database changes

Expand, then contract: add the new shape, write both, read the new one, remove the old shape only after the support window of any
API exposing it. RLS changes must be checked against the Realtime subscriptions in [realtime.md](realtime.md).

## 7. Verification

* Backend CI: contract validity, drift, surface tests, conformance tests, version gate, breaking-change detection.
* Mobile CI: generated client matches its pinned contract; offline transport tests; staging smoke tests when credentials exist.
* After each deploy: staging smoke tests with the **oldest supported** contract (follow-up; today they run with the pinned one).
