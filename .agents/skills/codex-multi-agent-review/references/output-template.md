# Review output template

Use this template for the integrated final response. Keep it concise for small diffs and expand only when the review found meaningful risk.

## Verdict values

- `changes requested`: at least one P0/P1 finding, or the change cannot be safely assessed because a required check or context is unavailable.
- `approve with comments`: no blocking issue, but there are important P2 findings or test gaps.
- `approve`: no material findings.
- `needs human decision`: tradeoff, product behavior, security exception, or rollout decision cannot be resolved from code alone.

## Severity scale

- `P0`: confirmed critical security/data loss/outage risk; do not merge.
- `P1`: likely bug, regression, privilege/data exposure, or unsafe migration; should fix before merge.
- `P2`: important maintainability, test, reliability, UX, or docs issue; should address or explicitly accept.
- `P3`: minor improvement; include only when useful and not noisy.

## Finding schema for subagents

Each subagent should return findings in this shape:

```markdown
### [P1|P2|P3] short title
- file: `path/to/file.ext:line` or `path/to/file.ext` if line is unknown
- evidence: concrete code path, changed behavior, or missing assertion
- impact: what can break, for whom, and under what condition
- recommendation: smallest useful fix or verification step
- confidence: high | medium | low
```

If a lane finds nothing material, return:

```markdown
No material findings for this lane.
Notes: [optional short caveat about checks not run or context not available]
```

## Integrated final response

```markdown
# Multi-agent code review

**Verdict:** [approve | approve with comments | changes requested | needs human decision]
**Target:** [branch/base, commit, PR, or working tree]
**Scope reviewed:** [short diff summary]

## Blocking findings

[Use this section only for P0/P1 issues. If none: "None."]

### [P1] [title]
- Location: `path:line`
- Evidence: [what the code does]
- Impact: [real failure mode]
- Recommendation: [specific fix or verification]

## Non-blocking findings

[Use for P2/P3 findings. If none: "None."]

## Missing or weak tests

[Specific test gaps tied to changed behavior. If none: "No material test gaps found."]

## Checks run

- [command] — [pass/fail/skipped and why]

## Agent coverage

- Correctness/behavior: [ran/no material findings/caveat]
- Security/privacy: [ran/no material findings/caveat]
- Testing/QA: [ran/no material findings/caveat]
- Maintainability/API: [ran/no material findings/caveat]
- Additional lanes: [performance/frontend/docs/ops as applicable]
```

## GitHub PR comment style

When writing a PR-ready comment, prefer this compact form:

```markdown
Codex multi-agent review: [verdict]

Blocking:
1. [P1] `path:line` — [one-sentence issue and fix]

Non-blocking:
1. [P2] `path:line` — [one-sentence issue and fix]

Checks: [commands and results]
Coverage: correctness, security, tests, maintainability[, additional lanes]
```

Do not include raw subagent transcripts unless the user asks for them.
