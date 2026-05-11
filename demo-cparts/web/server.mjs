// Minimal static file server for App Service Linux Node.
// Same shape as Maria's NCR demo — serves the static catalog assets.

import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function safeJoin(root, requestPath) {
  const normalized = normalize(requestPath).replace(/^[/\\]+/, "");
  const candidate = join(root, normalized);
  if (!candidate.startsWith(root)) return null;
  return candidate;
}

const server = createServer((req, res) => {
  let url = req.url || "/";
  const queryIndex = url.indexOf("?");
  if (queryIndex >= 0) url = url.slice(0, queryIndex);
  if (url === "/" || url === "") url = "/index.html";

  const fsPath = safeJoin(__dirname, url);
  if (!fsPath) {
    res.writeHead(400, { "content-type": "text/plain" });
    res.end("Bad request");
    return;
  }

  let stats;
  try {
    stats = statSync(fsPath);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
    return;
  }
  if (!stats.isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
    return;
  }

  const mime = MIME[extname(fsPath).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "content-type": mime,
    "cache-control": "no-cache, must-revalidate",
    "x-content-type-options": "nosniff",
    "strict-transport-security": "max-age=31536000",
  });
  createReadStream(fsPath).pipe(res);
});

server.listen(PORT, () => {
  process.stdout.write(`bufab-cparts-demo listening on :${PORT}\n`);
});
