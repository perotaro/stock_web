# Optional custom Codex agents

This skill works without custom agent files. Use the bundled TOML files only when the user wants reusable project-scoped review agents.

## Install into the current repository

From the skill directory:

```bash
python3 scripts/install_custom_agents.py --target .codex/agents
```

Or copy files manually:

```bash
mkdir -p .codex/agents
cp assets/codex-agents/*.toml .codex/agents/
```

Use `--force` only when the user explicitly wants to overwrite existing files.

## Suggested config

For broad reviews, keep agent fan-out bounded:

```toml
[agents]
max_threads = 6
max_depth = 1
```

## How to prompt after setup

```text
Use $codex-multi-agent-review to review this branch against main. Spawn review_correctness, review_security_privacy, review_tests, review_maintainability, and any relevant specialized reviewers. Wait for all results and summarize only verified findings.
```

## Safe defaults

The bundled review agents are read-only and omit explicit model names so they inherit the parent Codex session's model defaults. They set reasoning effort by task where appropriate, but the parent session can override these settings.
