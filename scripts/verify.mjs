#!/usr/bin/env node
// Verifies the bundled bufab-mcp by spawning it via the same path the
// project-scope .mcp.json uses, then calling initialize + tools/list +
// ui_export. Fails non-zero on any error so CI / `npm run setup` can rely on it.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const mcpEntry = resolve(projectRoot, "mcpserver", "bufab-mcp", "dist", "index.js");

if (!existsSync(mcpEntry)) {
  console.error(`[verify] MCP entry not found at ${mcpEntry}; run 'npm run mcp:build'`);
  process.exit(1);
}

const child = spawn(process.execPath, [mcpEntry], { stdio: ["pipe", "pipe", "pipe"] });
child.stderr.on("data", (d) => process.stderr.write("[mcp-stderr] " + d));

const rl = createInterface({ input: child.stdout });
const pending = new Map();
let nextId = 1;
const send = (m) => child.stdin.write(JSON.stringify(m) + "\n");
const req = (method, params) => {
  const id = nextId++;
  send({ jsonrpc: "2.0", id, method, params });
  return new Promise((res) => pending.set(id, res));
};
rl.on("line", (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (msg.id !== undefined && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

const TIMEOUT_MS = 30000;
const timeout = setTimeout(() => {
  console.error(`[verify] timed out after ${TIMEOUT_MS}ms`);
  child.kill();
  process.exit(1);
}, TIMEOUT_MS);

try {
  const init = await req("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "bufab-start-template-verify", version: "1.0" },
  });
  if (init.error) throw new Error("initialize: " + JSON.stringify(init.error));
  console.log("initialize OK:", init.result.serverInfo?.name, init.result.serverInfo?.version);

  send({ jsonrpc: "2.0", method: "notifications/initialized" });

  const tools = await req("tools/list", {});
  if (tools.error) throw new Error("tools/list: " + JSON.stringify(tools.error));
  const toolNames = (tools.result.tools ?? []).map((t) => t.name);
  console.log("tools/list OK (" + toolNames.length + "):", toolNames.join(", "));

  const exp = await req("tools/call", { name: "ui_export", arguments: {} });
  if (exp.error) throw new Error("ui_export: " + JSON.stringify(exp.error));
  const text = exp.result?.content?.[0]?.text;
  if (!text) throw new Error("ui_export returned empty content");
  const obj = JSON.parse(text);
  const version = obj?.meta?.version ?? obj?.version ?? "unknown";
  const keys = Object.keys(obj).join(", ");
  console.log("ui_export OK (v" + version + "):", keys);

  console.log("\n[verify] all checks passed");
  clearTimeout(timeout);
  child.kill();
  process.exit(0);
} catch (e) {
  clearTimeout(timeout);
  child.kill();
  console.error("[verify] FAILED:", e instanceof Error ? e.message : String(e));
  process.exit(1);
}
