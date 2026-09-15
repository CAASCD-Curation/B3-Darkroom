// 暗房 DARKROOM — 静态预览服务器（无框架、无构建步骤）
// 用法：npm run dev -- --port 7100 --host 127.0.0.1
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

let port = 7100;
let host = "127.0.0.1";
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--port" || a === "-p") port = Number(argv[++i]);
  else if (a.startsWith("--port=")) port = Number(a.slice(7));
  else if (a === "--host") host = argv[++i];
  else if (a.startsWith("--host=")) host = a.slice(7);
}
if (process.env.PORT) port = Number(process.env.PORT);
if (process.env.HOST) host = process.env.HOST;

/* 服务器始终服务自身所在目录（网站根）；normalize 会保留尾部分隔符，需去掉 */
const root = normalize(fileURLToPath(new URL(".", import.meta.url))).replace(/[\\/]+$/, "");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".pdf": "application/pdf",
  ".ico": "image/x-icon",
};

http.createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = normalize(join(root, path));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("Not Found");
  }
}).listen(port, host, () => {
  console.log(`暗房 DARKROOM → http://${host}:${port}/`);
});
