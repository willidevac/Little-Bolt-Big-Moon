import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PORT = Number.parseInt(process.env.PORT ?? "4173", 10);
const CONTENT_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".ttf": "font/ttf",
});

const server = http.createServer(async (request, response) => {
  try {
    const file = resolveRequestPath(request.url);
    const content = await fs.readFile(file);
    response.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(file)] ??
        "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(content);
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 400;
    response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(status === 404 ? "Not found" : "Invalid request");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.info(`Little Bolt, Big Moon: http://127.0.0.1:${PORT}`);
});

function resolveRequestPath(requestUrl = "/") {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const file = path.resolve(ROOT, relativePath);
  const relative = path.relative(ROOT, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Request outside project root");
  }
  return file;
}
