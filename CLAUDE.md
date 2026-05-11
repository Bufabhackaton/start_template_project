# Bufab project — agent rules

## Pre-flight check (every new task)

Before generating ANY code, call **`ui_export()`** via `bufab-mcp`. If it
returns "tool not found", "unknown server", an MCP connection error, or
anything that indicates the `bufab-mcp` server is not reachable: **STOP
IMMEDIATELY**. Do not write code. Tell the user verbatim:

> bufab-mcp is not registered in this agent's MCP config. Run
> `npx -y @greadcadinho/bufab-mcp setup` once on this machine, restart
> the agent session, then retry the task.

The MCP server is the only source of truth for the active design tokens,
strict constraints, infrastructure overlay, and Bicep validator. Without
it the rules below cannot be enforced and any code you generate will
likely violate Bufab guidelines.

---

This project enforces Bufab's design system (UI guidelines, infrastructure
rules, Azure Bicep validation) through the **`bufab-mcp` MCP server**. The
hooks in this repo will catch violations after the fact, but **you should
call the MCP tools BEFORE writing code, not as an afterthought**. Every
prompt also receives a UserPromptSubmit reminder summarizing the active
constraints — treat that reminder as a hard contract for the turn.

## Always-on workflow

### When writing UI (HTML / CSS / JSX / TSX / Vue / etc.)

Before generating ANY UI code, call these tools via `bufab-mcp`:

1. **`ui_section_spec(section_type)`** — returns the spec for the section
   you are about to build (`hero`, `footer`, `industries-grid`,
   `text-image-split`, `value-columns`, `diagram-section`, `insights-list`,
   `text-cta-block`, etc.). Read the spec before designing the layout —
   the spec dictates structure, padding, and which patterns are forbidden
   for that section.
2. **`ui_token(name)`** — for every color, spacing, typography, or radius
   value you would otherwise hard-code. Examples: `colors.primary`,
   `spacing.section-padding`, `borders.radius`. Never invent hex colors;
   the validator will block any hex outside the token set.
3. **`ui_search(query)`** — for anything not covered by the two above
   (component patterns, voice / tone, image treatment, etc.).

After writing, the PostToolUse hook runs `bufab-mcp validate <file>`. If
it returns blocker violations, treat them as build errors — fix the file
and re-edit before doing anything else.

### When working on Azure infrastructure

1. **`waf_guidelines(service)`** — Azure Well-Architected Framework
   guidance for the specific service (`storage`, `appservice`, `sql`,
   `keyvault`, etc.). Consult before finalizing any architecture decision.
2. **`rules_search(query)`** or
   **`rules_get(slug="bufab-infrastructure-context-overlay")`** —
   Bufab's internal overlay on top of WAF. The overlay encodes
   org-specific defaults (region, identity model, naming) that diverge
   from generic WAF advice.

### When generating or editing Azure Bicep

Run **`bicep_validate(files=[main.bicep, modules/*.bicep, *.bicepparam, bicepconfig.json])`**
BEFORE you commit. Include every file the build will touch — `bicep build`
and `bicep lint` need to resolve imports together. Validate after each
non-trivial edit, not just at the end.

## Reference

**The MCP server is the single source of truth for guidelines.** There is
no checked-in `guidelines/` directory — anything outside the MCP would
drift and lie about what the validator actually enforces.

To read the active rules:

- `ui_export` — full machine-readable guidelines (tokens, components, layout, strict_constraints).
- `ui_export_markdown` — same content as a human-readable markdown document.
- `ui_section_spec(section_type)`, `ui_token(name)`, `ui_search(query)` — narrower lookups.

The canonical design-tokens JSON ships inside the package at
`node_modules/@greadcadinho/bufab-mcp/data/bufab-design-tokens.json` if
you need a raw file to grep. Updating bufab-mcp:
`npm install @greadcadinho/bufab-mcp@latest`.
