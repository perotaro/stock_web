---
name: codex-multi-agent-review
description: multi-agent codex code review for pull requests, commits, branches, and uncommitted diffs. use when the user asks codex to review code, run review-style analysis, compare a branch with main, audit a pr, find regressions, security issues, missing tests, performance risks, maintainability problems, documentation gaps, or wants multiple reviewer perspectives or subagents before merging. also use when asked to set up reusable codex review agents or review instructions.
---

# Codex Multi-Agent Review

Use this skill to review code changes through multiple specialized reviewer perspectives and integrate findings into one evidence-backed review. Default to review-only: do not modify files unless the user explicitly asks for fixes.

## Core rules

- Treat this skill activation as explicit permission to use Codex subagents for non-trivial reviews, unless the user asks for a single-agent review or a very fast pass.
- Keep subagents read-only. They may inspect code, diffs, tests, logs, and docs, but must not edit files.
- Prefer real defects over style nits. A finding must identify a plausible failure mode, regression, security exposure, missing validation, missing test, or operational risk.
- Cite concrete evidence for every finding: changed file, relevant line or symbol, why it matters, and how to reproduce or verify when possible.
- Obey the closest applicable `AGENTS.md`, `AGENTS.override.md`, and any referenced `code_review.md` or review guideline files for each changed path.
- Run only targeted checks that are relevant and allowed by the current sandbox and approval policy. If checks are skipped, say why.
- Respond in the user's language. If the user language is unclear, default to Japanese.

## Review workflow

1. **Resolve the review target.**
   - If the user names a PR, branch, commit, or base branch, use that.
   - If the user asks to review current work, inspect `git status --short` and review uncommitted and staged changes.
   - If the current branch is not the default branch and no target is named, compare against `origin/main`, `main`, `origin/master`, or `master`, using the first valid base.
   - If no diff can be inferred, ask for the review target.

2. **Collect context before spawning reviewers.**
   - Read `AGENTS.md` files that apply to the repository root and changed paths.
   - Search for review guidance files such as `code_review.md`, `CONTRIBUTING.md`, `TESTING.md`, `SECURITY.md`, or package-specific docs referenced from `AGENTS.md`.
   - Inspect the diff summary, changed file list, and enough surrounding code to understand the execution path. Useful commands include `git diff --stat`, `git diff --name-only`, `git diff --check`, `git diff <base>...HEAD`, and targeted `rg` searches.
   - Capture the user's stated goal, constraints, and definition of done if provided.

3. **Select review lanes.**
   - Always include: correctness/behavior, tests/QA, maintainability/API design, and security/privacy.
   - Add performance/reliability when the diff touches hot paths, concurrency, caching, queues, data access, networking, or resource usage.
   - Add frontend/accessibility when the diff touches UI, design systems, routing, forms, browser APIs, or visual behavior.
   - Add data/migration/release operations when the diff touches schemas, migrations, feature flags, deployment, build systems, CI, infra, or config.
   - See `references/review-agents.md` for the lane definitions and reviewer prompts.

4. **Run the multi-agent pass.**
   - For diffs larger than roughly 200 lines, cross-cutting changes, production-sensitive code, or security-related changes, spawn one read-only subagent per selected lane and wait for all results.
   - Keep fan-out bounded: use at most six active review subagents at a time unless the user asks for exhaustive review.
   - For small diffs or environments without subagent support, simulate the same lanes sequentially in the main thread and label the output as a simulated multi-agent review.
   - Give every subagent the exact target, base branch or commit, changed file list, applicable guidance files, and the required finding schema from `references/output-template.md`.

5. **Integrate and verify.**
   - Re-read the evidence for every candidate finding before including it.
   - Deduplicate overlapping issues across agents.
   - Drop speculative concerns that cannot be tied to the diff or existing behavior.
   - Separate blocking issues from non-blocking suggestions.
   - Identify test gaps even when no functional bug is found, but do not label every missing test as blocking.

6. **Produce the final review.**
   - Use the structure in `references/output-template.md`.
   - Start with the verdict, then findings ordered by severity and confidence.
   - Include checks run and checks not run.
   - Include a short “agent coverage” section listing which lanes ran and any lane-specific caveats.

## Optional setup of custom review agents

This skill includes optional TOML definitions in `assets/codex-agents/` for project-scoped custom subagents. Use them only when the user asks to install or set up reusable review agents.

- To install them into the current repository, run `scripts/install_custom_agents.py` from the skill directory or copy the TOML files into `.codex/agents/`.
- See `references/custom-agent-setup.md` for setup details and safe defaults.
- Installing custom agents is not required to use this skill; the workflow can spawn built-in read-only agents with lane-specific prompts.
