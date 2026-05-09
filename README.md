# bufab-start-template

Starter template for Bufab projects. Clone it, run one setup command, and you have:

- The **bufab-mcp** server (as a git submodule) auto-registered with Claude Code via project-scope `.mcp.json`
- **Hooks** for Claude Code and Cline that inject UI guideline context into every prompt and validate every file you write/edit against the Bufab design system
- The current **Bufab UI guidelines** as a sibling submodule

When you ask Claude/Cline to write UI code, the validator catches off-token colors, gradient violations, etc., and feeds them back as build errors — so the guidelines are followed by default rather than by discipline.

## Quickstart

```bash
git clone <this repo> my-project
cd my-project
npm run setup
```

`npm run setup` runs:

1. `git submodule update --init --recursive` — pulls `mcpserver/` and `guidelines/`
2. `npm install` inside `mcpserver/bufab-mcp/` (downloads Bicep on Windows, may take a minute)
3. `npm run build` in `mcpserver/bufab-mcp/` — produces `dist/index.js`
4. `npm run verify` — JSON-RPC smoke check that the MCP starts and exposes its tools

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
├── package.json
├── mcpserver/  ← submodule https://github.com/Bufabhackaton/mcpserver.git
└── guidelines/ ← submodule https://github.com/Bufabhackaton/guidelines.git
```

## Per-client setup

### Claude Code

`.mcp.json` is auto-detected. On first launch in this directory, Claude Code will prompt you to approve the project-scope MCP server. Approve it.

Verify with `claude mcp list` — `bufab-mcp` should appear with `✓ Connected`.

### Cline

Add a server entry to your Cline config (`cline_mcp_settings.json`) pointing at the same `dist/index.js`. The hook scripts under `.clinerules/hooks/` will be picked up automatically.

### Cursor

Cursor reads `.cursor/mcp.json` and `.cursor/hooks.json`. Those files are not bundled in this template — if you use Cursor, run `npm run setup`, then call the bufab-mcp `setup_environment` tool from within Cursor to write a `.cursor/` config sized to this layout.

## What the hooks do

- **UserPromptSubmit**: every prompt you send to Claude/Cline gets a reminder injected with the active guideline version, the bufab-mcp tools to consult (`ui_section_spec`, `ui_token`, `ui_search`, `waf_guidelines`, `bicep_validate`), and a pointer to the full reference at `guidelines/bufab_ui_guidelines.md`.
- **PostToolUse** (Edit / Write / MultiEdit): the file you just wrote is run through `mcpserver/bufab-mcp/scripts/validate.mjs` against live UI guidelines from the MCP. Blockers are returned as `additionalContext` so Claude sees them on the next turn.

## Updating

```bash
npm run mcp:update    # pulls latest mcpserver + guidelines via submodules
npm run mcp:build     # rebuild dist
```

Commit the updated submodule pointers to share the bump with teammates.

## Hook files and the upstream template

The hook scripts under `.clinerules/hooks/` are committed copies of the canonical
template bundled inside the bufab-mcp submodule at
`mcpserver/bufab-mcp/agent-config/.clinerules/`. They have to live on disk in
this repo so Claude Code's `.claude/settings.json` and Cline's hooks can find
them before the MCP starts.

When the upstream template changes, refresh them:

```bash
npm run mcp:update                                                # bump submodules
cp -r mcpserver/bufab-mcp/agent-config/.clinerules/hooks/* .clinerules/hooks/
git diff .clinerules/                                             # review
git add .clinerules/ mcpserver
git commit -m "Refresh hook scripts and bump mcpserver"
```

(On Windows, replace `cp -r` with `Copy-Item -Recurse -Force`.)
