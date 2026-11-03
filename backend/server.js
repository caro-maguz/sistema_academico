const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT) || 3000;
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (url.pathname === "/api/health" && request.method === "GET") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ status: "ok", mode: "frontend-demo", apiReady: false }));
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    response.writeHead(501, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "API de negocio aún no implementada." }));
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { allow: "GET, HEAD" });
    response.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const pathSegments = relativePath.split(/[\\/]/);
  const filePath = path.resolve(root, ...pathSegments);
  const isApplicationFile = ["index.html", "login.html", "estilos.css"].includes(relativePath)
    || (pathSegments[0] === "js" && pathSegments.length > 1);
  const hasUnsafeSegment = pathSegments.some((segment) => !segment || segment === "." || segment === ".." || segment.startsWith("."));
  if (!isApplicationFile || !filePath.startsWith(root + path.sep) || hasUnsafeSegment) {
    response.writeHead(404);
    response.end();
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, {
      "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "content-length": stats.size,
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin-when-cross-origin",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(port, () => {
  console.log(`SIGA demo server listening on port ${port}`);
});
