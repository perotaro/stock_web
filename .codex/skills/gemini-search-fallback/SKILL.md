---
name: gemini-search-fallback
description: 'Prefer this skill whenever a task needs web research and Gemini-first is acceptable: when the user asks to search, look something up, verify, confirm, check official docs, inspect release notes, gather source links, or answer latest/current/today questions. Trigger on requests like "調べて", "検索して", "確認して", "最新", "今日", "公式ドキュメント", "出典", "ソース", or "リンク". Default split: Gemini performs the web research and source gathering; Codex critically reviews and synthesizes Gemini findings. Use Codex web search only when Gemini fails, is unavailable, lacks enough evidence, or higher-priority policy requires direct verification.'
---

# Gemini Search Fallback

Use this skill when the user wants Gemini-assisted web research to be the first attempt.

## When to Use

- The user explicitly asks to use Gemini or `gemini-mcp-tool` first for web research
- The user asks to search or look something up, including phrases like "調べて", "検索して", "確認して", "ソースを出して", or "公式 docs を見て"
- The user asks for latest, current, today, recent, release-note, pricing, schedule, or version information and Gemini-first is acceptable
- The user wants links, citations, source names, or a quick evidence-backed summary before deeper verification
- The task benefits from current web information, but a Gemini-first workflow is acceptable
- You want a cheaper or broader first-pass search before using Codex web tools

Do not use this skill when:

- The user explicitly says not to use Gemini
- Higher-priority policy requires direct verification, exact source attribution, or mandatory browsing and Gemini output alone is not sufficient
- The task is high-stakes and Gemini does not provide enough confidence or source detail

## Goal

Use `gemini-mcp-tool` as the primary web-research path for web-search-like work.
Default operating model:
- Gemini does the web lookup, source gathering, and current-information retrieval.
- Codex reads Gemini's findings, checks them for coherence/completeness, and writes the final synthesis.
- Codex web search is an exception path, not the default path.

Only use Codex web search when Gemini search is unavailable, fails, times out, hits quota/auth limits, returns insufficiently supported results, or higher-priority policy requires direct verification from first-party pages.

## Workflow

### 1. Decide Whether External Research Is Needed

Use normal reasoning first. If the task needs current external information, proceed with Gemini-first research.

### 2. Ask Gemini First

Use the Gemini MCP tool first.

Preferred tool:
- `ask_gemini`

Prompting guidance:
- Tell Gemini to use web search when the task requires current information
- Ask for concrete dates
- Ask for source names and direct links when possible
- Ask for a short answer plus evidence

Example prompt shape:

```text
Use web search to answer this question. Include the key answer, concrete dates, and source links. If information is uncertain, say so clearly: <user request>
```

### 3. Evaluate Gemini's Result

Treat Gemini-first research as successful only if the response is usable.

Success criteria:
- The answer is responsive to the user request
- The result is current enough for the question
- The response includes enough evidence to support the claims
- There is no obvious quota, auth, timeout, or tool failure

If these criteria are met, prefer to stay in the Gemini-only research path:
- Do not open the web separately just to restate the same findings
- Let Codex do the critical reading and summarization from Gemini's output
- Call out uncertainty explicitly instead of silently escalating to Codex web

Failure or insufficiency conditions:
- Tool error, timeout, quota error, auth error, or sandbox/runtime failure
- Gemini says it cannot complete the search
- Missing dates for time-sensitive claims
- Missing links or vague sourcing when the task needs evidence
- Ambiguous or low-confidence answer
- Any sign that the result may be stale, inferred, or insufficiently verified

### 4. Codex Synthesis Default

After a usable Gemini result, Codex should:
- extract the key answer
- check for internal inconsistencies, vague sourcing, or missing caveats
- present a concise, evidence-aware summary
- state clearly when a point is an inference from Gemini-provided evidence rather than directly verified by Codex

This is the default workflow for most web-backed answers.

### 5. Fall Back to Codex Web Search Only When Needed

If Gemini-first research fails or is insufficient, use Codex web tools.

Fallback triggers:
- Gemini tool invocation fails
- Gemini returns unusable or weakly supported results
- The user needs exact links, quotes, or source attribution and Gemini output is not enough
- Higher-priority policy requires direct verification

When falling back, search efficiently and prefer primary or official sources when relevant.

### 6. Verification Rule

If a higher-priority instruction requires direct verification, do not rely only on Gemini output.
Use Codex web tools to verify the critical claim set before answering.

Examples:
- latest news
- current prices
- laws, regulations, or medical guidance
- exact quotes or source-linked claims
- recommendations involving meaningful money, risk, or time

### 7. Answer Transparently

In the final answer, briefly state which path was used:
- Gemini researched, Codex synthesized
- Gemini-first, then Codex web fallback
- Gemini-first, then Codex web verification

Do not mention internal tool mechanics unless it helps the user understand confidence or limitations.

## Practical Notes

- Prefer a lightweight Gemini model first if quota or latency is a concern
- If Gemini repeatedly fails due to quota, skip repeated retries and move to Codex web
- Keep Gemini prompts narrow and explicit; broad prompts waste time and tokens
- For normal web-backed explanations, do not use Codex web if Gemini already provided sufficient evidence; use Codex for analysis and writing instead
- For technical topics, prefer official docs during fallback verification
