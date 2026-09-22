const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 4173);
const BASE = (process.env.PANTA_API_BASE_URL || "https://live-api.panta.market/api/v1").replace(/\/$/, "");
const KEY = process.env.PANTA_API_KEY || "";
const PUBLIC = path.join(__dirname, "public");
const DEMO = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "demo-markets.json"), "utf8"));

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function json(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}

async function panta(pathname, search = "") {
  if (!KEY) throw Object.assign(new Error("PANTA_API_KEY is not configured"), { status: 503 });
  const response = await fetch(`${BASE}${pathname}${search}`, {
    headers: { accept: "application/json", "x-api-key": KEY },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = { message: text }; }
  if (!response.ok) {
    const error = new Error(body?.detail || body?.message || `Panta returned ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function demoDetail(id) {
  const item = DEMO.items.find((market) => market.marketId === id);
  if (!item) return null;
  return { ...item, description: item.description || "Demo market for the offline judging mode." };
}

function demoTrades(id) {
  return { marketId: id, items: DEMO.trades[id] || [] };
}

async function api(req, res, url) {
  const demo = url.searchParams.get("demo") === "1";
  if (url.pathname === "/api/health") {
    return json(res, 200, { ok: true, mode: KEY ? "live" : "demo", provider: "Panta" });
  }
  if (url.pathname === "/api/categories") {
    if (demo || !KEY) return json(res, 200, { categories: DEMO.categories, source: "demo" });
    return json(res, 200, { ...(await panta("/categories/")), source: "live" });
  }
  if (url.pathname === "/api/markets") {
    if (demo || !KEY) return json(res, 200, { items: DEMO.items, nextCursor: null, source: "demo" });
    const query = new URLSearchParams(url.searchParams);
    query.delete("demo");
    return json(res, 200, { ...(await panta("/markets/", `?${query}`)), source: "live" });
  }
  const detailMatch = url.pathname.match(/^\/api\/markets\/([^/]+)$/);
  if (detailMatch) {
    const id = decodeURIComponent(detailMatch[1]);
    if (demo || !KEY) {
      const item = demoDetail(id);
      return item ? json(res, 200, { ...item, source: "demo" }) : json(res, 404, { error: "Market not found" });
    }
    return json(res, 200, { ...(await panta(`/markets/${encodeURIComponent(id)}/`)), source: "live" });
  }
  const tradesMatch = url.pathname.match(/^\/api\/markets\/([^/]+)\/trades$/);
  if (tradesMatch) {
    const id = decodeURIComponent(tradesMatch[1]);
    if (demo || !KEY) return json(res, 200, { ...demoTrades(id), source: "demo" });
    return json(res, 200, { ...(await panta(`/markets/${encodeURIComponent(id)}/trades/`, "?limit=50")), source: "live" });
  }
  return json(res, 404, { error: "Unknown API route" });
}

function staticFile(req, res, url) {
  const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const safe = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const file = path.join(PUBLIC, safe);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }
  res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    return staticFile(req, res, url);
  } catch (error) {
    return json(res, error.status || 500, { error: error.message, details: error.body || null });
  }
});

server.listen(PORT, () => {
  console.log(`Panta Signal Lens: http://localhost:${PORT}`);
  console.log(`Data mode: ${KEY ? "live Panta API" : "demo fixture (set PANTA_API_KEY for live)"}`);
});

