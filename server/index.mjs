import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { answerChat, parseMessages } from "./chat.mjs";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const siteOrigin = process.env.POSCHITAY_ORIGIN || "https://poschitay24.ru";
const port = Number(process.env.PORT || 8787);
const sites = new Set([siteOrigin, `http://localhost:${port}`, `http://127.0.0.1:${port}`]);
const preview = process.env.POSCHITAY_PREVIEW === "1";
const perClient = new Map();
let active = 0;
let windowStart = 0;
let requests = 0;

function permits(client) {
  const now = Date.now();
  if (now - windowStart >= 60_000) {
    windowStart = now;
    requests = 0;
    perClient.clear();
  }
  const used = perClient.get(client) || 0;
  if (requests >= 30 || used >= 6 || active >= 4) return false;
  requests++;
  perClient.set(client, used + 1);
  return true;
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > 40_000) {
      // Preserve the connection long enough to send the 413 response.
      req.pause();
      return null;
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

const types = { html: "text/html", css: "text/css", js: "text/javascript", svg: "image/svg+xml", png: "image/png", ico: "image/x-icon" };

async function servePreview(path, res) {
  if (!/^\/(?:[a-z0-9-]+(?:\.html)?|assets\/[a-z0-9-]+\.(?:css|js|svg|png)|favicon\.ico)?$/.test(path)) return json(res, 404, { error: "Страница не найдена" });
  const file = path === "/" ? "/index.html" : path.includes(".") ? path : path + ".html";
  try {
    const body = await readFile(new URL(".." + file, import.meta.url));
    res.writeHead(200, { "Content-Type": types[file.split(".").at(-1)] + (file.endsWith(".png") || file.endsWith(".ico") ? "" : "; charset=utf-8") });
    res.end(body);
  } catch {
    json(res, 404, { error: "Страница не найдена" });
  }
}

const server = createServer({ requestTimeout: 30_000, headersTimeout: 10_000 }, async (req, res) => {
  const path = req.url?.split("?")[0];
  if (path !== "/api/chat") {
    if (preview && req.method === "GET") return servePreview(path, res);
    return json(res, 404, { error: "Страница не найдена" });
  }
  const origin = req.headers.origin;
  if (!origin || !sites.has(origin)) return json(res, 403, { error: "Этот источник запроса не поддерживается" });
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" });
    return res.end();
  }
  if (req.method !== "POST") return json(res, 405, { error: "Метод не поддерживается" });
  if (!req.headers["content-type"]?.startsWith("application/json")) return json(res, 415, { error: "Ожидается JSON" });
  if (!apiKey) return json(res, 503, { error: "ИИ-чат ещё не подключён" });
  let messages;
  try {
    if (Number(req.headers["content-length"]) > 40_000) return json(res, 413, { error: "Запрос слишком длинный" });
    const body = await readBody(req);
    if (body === null) return json(res, 413, { error: "Запрос слишком длинный" });
    messages = parseMessages(body);
  } catch {
    return json(res, 400, { error: "Проверьте размер и формат сообщения" });
  }
  if (!permits(req.socket.remoteAddress)) return json(res, 429, { error: "Слишком много запросов. Попробуйте через минуту" });
  active++;
  try {
    json(res, 200, await answerChat(messages, { apiKey, model }));
  } catch {
    json(res, 502, { error: "ИИ сейчас не ответил. Попробуйте ещё раз" });
  } finally {
    active--;
  }
});

server.listen(port, process.env.HOST || "127.0.0.1", () => {
  console.log(`Poschitay chat listening on port ${port}`);
});
