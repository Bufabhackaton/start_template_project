---
name: bufab-preflight
description: Run this skill at the start of any task that builds, creates, scaffolds, implements, generates, or modifies code, UI, or infrastructure for a Bufab project. It verifies the bufab-mcp server is reachable and primes the conversation with the active design tokens, strict constraints, infrastructure overlay, and architectural rules — BEFORE a single line of code is written. Invoke whenever the user asks to "build", "create", "make", "scaffold", "implement", "ship", "write", or "generate" anything in a Bufab repo, or whenever the task involves HTML/CSS/JSX/TSX, Bicep/IaC, Go services, or Bufab-specific UI/infra concerns.
---

# Bufab Preflight Skill

This skill enforces the rule that **every code-writing task in a Bufab repo starts with a live MCP check**, because the `bufab-mcp` server is the only source of truth for the active design system, strict constraints, infrastructure overlay, and Bicep validator. Without it, anything you write is a guess.

## Step 1 — Verify the MCP is reachable

Call `ui_export` via the `bufab-mcp` MCP server. This is the cheapest single tool call that exercises the server.

**If the call fails** with `tool not found`, `unknown server`, an MCP connection error, or anything indicating `bufab-mcp` is not registered or not running:

1. **STOP IMMEDIATELY.** Do not write code, do not call other MCP tools, do not improvise.
2. Tell the user, verbatim:

   > bufab-mcp is not registered in this agent's MCP config. Run `npx -y @greadcadinho/bufab-mcp setup` once on this machine, restart this agent session, then retry the task.

3. End the turn. Wait for the user to confirm they have run setup and restarted.

**If the call succeeds**, continue to Step 2. The response also primes you with the active token set and constraint list — read it.

## Step 2 — Identify the surface area you're about to touch

Map the user's request to one or more of these surfaces:

| Surface | What you'll write | Required MCP tools (call BEFORE writing) |
|---|---|---|
| UI | HTML, CSS, JSX, TSX, Vue, Svelte | `ui_section_spec(section_type)`, `ui_token(name)`, `ui_search(query)` |
| Azure infra | Bicep, parameters, naming | `rules_get(slug="bufab-infrastructure-context-overlay")`, `waf_guidelines(service)`, `bicep_validate(files=[…])` |
| Backend code | Go, services, repositories | `arch_validate_requirements(text)`, `arch_search(query)` |
| Anything else | Cross-cutting | `rules_search(query)`, `ui_export_markdown` |

Call the matching tool(s) **before** writing. The spec or rule answer dictates structure, padding, naming, tags, and which patterns are forbidden — never invent these from memory.

## Step 3 — Honor strict constraints

The `ui_export` response includes a `strict_constraints` array. Treat each entry as a hard contract for the turn:

- Never invent hex colors, font names, spacing values, or radii. Every visual value must come from a token.
- If the active design system is glassmorphism v2.0.1, the accent color is cyan (`#4ecdc4`). Do not use the legacy orange (`#E8610A`) — the validator will block it.
- If the user asks for a color or pattern that is not in the token set, refuse politely and offer the closest in-token alternative.

## Step 4 — Trust the hooks

After you write any file, the `PostToolUse` hook in `.claude/settings.json` will spawn a fresh `bufab-mcp validate` against it. If the hook returns blocker violations:

- Treat them as build errors. The next turn's `UserPromptSubmit` reminder will surface them.
- Fix the file and re-edit before doing anything else. Do not deploy, do not commit, do not move on.

## What this skill protects against

- The agent generating code that drifts from the live design tokens because the rules were stale at session start.
- The agent inventing colors, naming, or regions when the canonical answer is one MCP call away.
- The agent producing infrastructure that fails the Q3 audit because the Bicep validator never ran.
- The agent writing 800 lines, the user shipping it, and the violation surfacing in production.

## What this skill does NOT do

- It does not replace the `PostToolUse` hook. The hook is the last line of defense; this skill is the first.
- It does not bypass the user. If the MCP is missing, you halt and instruct — you do not silently fall back to memory.
- It does not cache. Every new task re-reads the MCP, so rule changes propagate without a redeploy.

## One-liner for the user, if they ask what you're doing

> Before I write anything, I'm checking the live Bufab design tokens, infrastructure rules, and strict constraints from the MCP server — so what I generate is already compliant, not patched up after the fact.
