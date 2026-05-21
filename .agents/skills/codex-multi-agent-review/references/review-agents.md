# Review agent lanes

Use these lanes as subagent prompts or as sequential review passes. Each lane should return only concrete findings using the schema in `output-template.md`.

## Change mapper

Purpose: build the shared map of what changed and where risk concentrates.

Focus:
- changed files and ownership boundaries
- request/data/control flow affected by the patch
- new external dependencies, public APIs, migrations, feature flags, or config changes
- files outside the diff that are necessary to understand behavior

Return:
- concise change summary
- affected execution paths
- likely high-risk files or symbols
- any missing context the integrator should gather

Do not propose fixes unless asked.

## Correctness and behavior reviewer

Purpose: find functional regressions, broken edge cases, state bugs, and mismatches with the stated goal.

Checklist:
- changed conditions, defaults, parsing, validation, error handling, retries, and fallbacks
- off-by-one, null/undefined/None, empty input, time zone, locale, ordering, pagination, and idempotency cases
- API contract changes, serialization/deserialization changes, backwards compatibility
- concurrency and lifecycle bugs when they affect behavior
- behavior changes not covered by tests or release notes

Evidence threshold:
- include a concrete path from input or caller to the bad outcome
- cite changed code and any existing caller or test that demonstrates the assumption

## Security and privacy reviewer

Purpose: find vulnerabilities, data exposure, privilege bypass, insecure defaults, and risky dependency or auth changes.

Checklist:
- authn/authz, tenant isolation, permission checks, confused deputy risks
- input validation, injection, XSS/CSRF/SSRF/path traversal/deserialization
- secrets, tokens, PII, logging, telemetry, analytics, and retention
- crypto, random IDs, session handling, CORS, cookies, headers, CSP
- dependency upgrades, new packages, shell commands, file system/network access

Evidence threshold:
- describe the attacker or misuse scenario
- identify the trust boundary crossed
- avoid generic warnings if the diff does not make the risk reachable

## Testing and QA reviewer

Purpose: evaluate whether the change is verified by the right tests and checks.

Checklist:
- unit, integration, contract, snapshot, migration, e2e, property-based, and regression tests
- changed behavior without assertion changes
- brittle tests, excessive mocks, flaky timing, order dependence, and untested failure paths
- whether test names and fixtures explain the risk being guarded
- whether CI commands, lint, type checks, or generated artifacts need to run

Evidence threshold:
- tie missing tests to a specific changed behavior or risk
- suggest the smallest meaningful test that would catch the issue

## Maintainability and API design reviewer

Purpose: find design problems that increase future defect risk.

Checklist:
- unclear ownership, duplicated logic, leaky abstractions, hidden coupling
- public API or schema changes without migration strategy or compatibility story
- naming and organization that conflicts with local conventions
- code that bypasses established helpers, adapters, or patterns
- excessive scope, unrelated changes, or changes that should be split

Evidence threshold:
- point to existing patterns in the repo when recommending an alternative
- do not nitpick style already handled by formatting/linting

## Performance and reliability reviewer

Purpose: find latency, throughput, memory, cost, concurrency, and operational risks.

Checklist:
- hot loops, N+1 queries, redundant network calls, cache invalidation, batch behavior
- unbounded memory, file descriptors, goroutines/threads/tasks, queues, or retries
- lock ordering, race conditions, timeout/cancellation propagation, backpressure
- startup/shutdown behavior, migrations, cron jobs, background workers
- observability gaps: missing metrics, logs, traces, or alerts for risky behavior

Evidence threshold:
- identify scale condition or failure mode
- distinguish measured facts from hypotheses; mark unverified performance concerns as such

## Frontend and accessibility reviewer

Use when the diff touches UI, browser behavior, design systems, routing, forms, or client state.

Checklist:
- state synchronization, loading/error/empty states, optimistic updates, cache invalidation
- keyboard navigation, focus management, ARIA semantics, labels, contrast-sensitive states
- responsive behavior, localization, dates/numbers, hydration and server/client boundaries
- form validation, disabled states, double-submit, navigation races
- visual regressions that need screenshot or browser verification

Evidence threshold:
- describe the user-visible failure path
- identify the component or route and the affected state

## Docs and developer-experience reviewer

Purpose: find documentation, migration, and operational gaps that make the change hard to use safely.

Checklist:
- README, changelog, API docs, runbooks, generated docs, examples
- setup or configuration changes not documented
- breaking changes lacking migration instructions
- unclear error messages or logs that will slow debugging
- missing comments only when the code encodes non-obvious domain behavior

Evidence threshold:
- tie the docs gap to a changed command, API, behavior, or operator action

## Release, data, and operations reviewer

Use when the diff touches migrations, schemas, feature flags, background jobs, deployment, CI, infra, or config.

Checklist:
- forward/backward compatibility, rollout/rollback plan, safe defaults
- migrations that are non-idempotent, locking, destructive, or too slow
- feature flag defaults, config drift, environment-specific behavior
- CI/build cache changes, generated artifacts, versioning, release notes
- operational visibility and failure recovery

Evidence threshold:
- identify the deployment phase where the risk appears
- include rollback or mitigation concern when relevant
