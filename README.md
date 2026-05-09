# bufab-start-template

Starter template for Bufab projects. Clone it, run `npm install`, and you have:

- The **bufab-mcp** server installed as a regular npm dependency, auto-registered with Claude Code via project-scope `.mcp.json`
- **Hooks** for Claude Code and Cline that inject UI guideline context into every prompt and validate every file you write/edit against the Bufab design system
- The canonical **Bufab UI guidelines** as a sibling git submodule (markdown reference)

When you ask Claude/Cline to write UI code, the validator catches off-token colors, gradient violations, etc., and feeds them back as build errors — so the guidelines are followed by default rather than by discipline.

## Quickstart

```bash
git clone https://github.com/Bufabhackaton/start_template_project.git my-project
cd my-project
npm run setup
```

`npm run setup` runs:

1. `npm install` — pulls `@greadcadinho/bufab-mcp` from npm (fetches the seeded LanceDB and bundled validator inside the package; Bicep is downloaded on first install)
2. `git submodule update --init --recursive` — clones the `guidelines/` markdown reference
3. `npm run verify` — JSON-RPC smoke check that the MCP starts and `ui_export` returns v2.1

Then open the project in Claude Code, Cline, or Cursor — the MCP autoconnects via `.mcp.json` (Claude Code) or per-client config (see below).

## Layout

```
bufab-start-template/
├── .mcp.json                   # Claude Code project-scope MCP registration
├── .claude/
│   └── settings.json           # PostToolUse + UserPromptSubmit hook config
├── .clinerules/
│   └── hooks/                  # Hook scripts (shared across Claude Code + Cline)
│       └── lib/
│           ├── _core.mjs       # Validator spawning + reminder text builder
│           ├── claude-*.mjs    # Claude Code adapters
│           └── cursor-*.mjs    # Cursor adapters
├── .gitattributes              # LF line endings for hook .mjs files
├── .gitignore
├── package.json                # depends on @greadcadinho/bufab-mcp
├── scripts/verify.mjs          # initialize + tools/list + ui_export smoke test
└── guidelines/                 ← submodule https://github.com/Bufabhackaton/guidelines.git
```

## Per-client setup

### Claude Code

`.mcp.json` is auto-detected. On first launch in this directory, Claude Code will prompt you to approve the project-scope MCP server. Approve it. Verify with `claude mcp list` — `bufab-mcp` should appear with `✓ Connected`.

### Cline

Add a server entry to your Cline config (`cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "bufab-mcp": {
      "command": "node",
      "args": ["C:\\absolute\\path\\to\\my-project\\node_modules\\@greadcadinho\\bufab-mcp\\dist\\index.js"]
    }
  }
}
```

The hook scripts under `.clinerules/hooks/` are picked up automatically.

### Cursor

Cursor reads `.cursor/mcp.json` and `.cursor/hooks.json`. These aren't bundled — if you use Cursor, run `npm run setup`, then call the bufab-mcp `setup_environment` tool from within Cursor to write a `.cursor/` config sized to this layout.

## What the hooks do

- **UserPromptSubmit**: every prompt you send to Claude/Cline gets a reminder injected with the active guideline version, the bufab-mcp tools to consult (`ui_section_spec`, `ui_token`, `ui_search`, `waf_guidelines`, `bicep_validate`), and a pointer to the full reference at `guidelines/bufab_ui_guidelines.md`.
- **PostToolUse** (Edit / Write / MultiEdit): the file you just wrote is run through `node_modules/@greadcadinho/bufab-mcp/scripts/validate.mjs` against live UI guidelines from the MCP. Blockers are returned as `additionalContext` so Claude sees them on the next turn.

## Updating

```bash
npm run mcp:update     # bumps @greadcadinho/bufab-mcp to @latest and pulls latest guidelines submodule
git add . && git commit -m "Bump bufab-mcp"
```

The version pin in `package.json` is the source of truth. Pin a specific version (e.g. `^1.0.0`) for reproducibility, or `latest` to always pull head.

## Hook files

The hook scripts under `.clinerules/hooks/` are committed copies of the canonical template at `@greadcadinho/bufab-mcp/agent-config/.clinerules/` (inside the published package). They live in this repo so Claude Code's `.claude/settings.json` and Cline's hooks can find them before the MCP boots.

When the upstream template changes, refresh them:

```bash
npm install @greadcadinho/bufab-mcp@latest
cp -r node_modules/@greadcadinho/bufab-mcp/agent-config/.clinerules/hooks/* .clinerules/hooks/
git diff .clinerules/
git add .clinerules/
git commit -m "Refresh hook scripts to bufab-mcp@<version>"
```

(On Windows, replace `cp -r` with `Copy-Item -Recurse -Force`.)
