"use strict";
const fs = require("node:fs");
const evaluate = require("../assets/generated-calculator.js");
const assert = require("node:assert/strict");

const queue = JSON.parse(fs.readFileSync("automation/calculators.json"));
const source = fs.readFileSync("assets/app.js", "utf8");
const rawCatalogue = source.split("const CALCS = [")[1].split("\n];")[0];
const catalogue = new Map(Array.from(rawCatalogue.matchAll(/^\s*\["([^"]+)", "([^"]+)", "([a-z0-9-]+)",/gm),
  ([, icon, title, slug]) => [slug, { icon, title }]));
const proposed = new Set((process.env.PROPOSED_SLUGS || "").split(/\s+/));
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fieldPattern = /^[a-z][a-z0-9_]{0,30}$/;
const escape = (value) => value.replace(/[&<>"']/g, (ch) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

function validate(spec) {
  const { slug, icon, title, description, explanation, expression, fields, unit, checks, related } = spec;
  assert(typeof slug === "string" && slug.length <= 55 && slugPattern.test(slug));
  for (const [str, max] of [[icon, 12], [title, 75], [description, 210], [explanation, 850], [unit, 28]]) {
    assert(typeof str === "string" && str.trim() && str.length <= max && !/[\r\n]/.test(str));
  }
  assert(Array.isArray(fields) && fields.length >= 2 && fields.length <= 7);
  const ids = new Set();
  for (const { id, label, min, max, value } of fields) {
    assert(typeof id === "string" && fieldPattern.test(id) && !["f", "out", "constructor", "prototype"].includes(id) && !ids.has(id));
    assert(typeof label === "string" && label.trim() && label.length <= 96 && !/[\r\n]/.test(label));
    assert([min, max, value].every(Number.isFinite) && min >= 0 && min < max && max <= 1e8 && min <= value && value <= max);
    ids.add(id);
  }
  assert(Array.isArray(expression) && expression.length <= 60 && expression.every((token) => typeof token === "string" && token.length <= 32));
  assert(Array.isArray(checks) && checks.length >= 2 && checks.length <= 6);
  assert(new Set(checks.map(({ values }) => JSON.stringify([...ids].map((id) => values[id])))).size >= 2);
  assert(Array.isArray(related) && related.length <= 4 && related.every((id) => catalogue.has(id)));
  for (const { values, expected } of checks) {
    assert(Object.keys(values).length === ids.size && Number.isFinite(expected) && expected >= 0);
    for (const { id, min, max } of fields) assert(Number.isFinite(values[id]) && min <= values[id] && values[id] <= max);
    assert(Math.abs(evaluate(expression, values) - expected) <= Math.max(1, Math.abs(expected)) * 1e-9, "Контрольный пример не сошёлся");
  }
  const defaultResult = evaluate(expression, Object.fromEntries(fields.map(({ id, value }) => [id, value])));
  assert(defaultResult >= 0);
}

async function model(prompt) {
  const response = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST", signal: AbortSignal.timeout(175000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "qwen2.5:1.5b", format: "json", stream: false,
      options: { temperature: 0.15, num_predict: 1500 }, prompt })
  });
  if (!response.ok) throw Error("Локальная модель недоступна");
  return JSON.parse((await response.json()).response);
}

function exists(slug) {
  return catalogue.has(slug) || fs.existsSync(slug + ".html") || proposed.has(slug);
}

function insert(file, marker, line) {
  const content = fs.readFileSync(file, "utf8");
  assert(content.split(marker).length === 2, "Не найдено единственное место вставки в " + file);
  fs.writeFileSync(file, content.replace(marker, line + marker));
}

function render(spec) {
  const { slug, title, icon, description, explanation, fields, unit, expression, related } = spec;
  const link = "https://poschitay24.ru/" + slug;
  const inputs = fields.map(({ id, label, min, max, value }) =>
    `    <div><label for="${id}">${escape(label)}</label><input id="${id}" inputmode="decimal" data-lower="${min}" data-upper="${max}" value="${value}"></div>`).join("\n");
  const tile = (id, glyph, name, detail) => `<a class="tile" href="${id}"><span class="ico">${escape(glyph)}</span><b>${escape(name)}</b>${detail ? "<small>" + escape(detail) + "</small>" : ""}</a>`;
  const links = [...new Set(related)].map((id) => tile(id, catalogue.get(id).icon, catalogue.get(id).title));
  const data = JSON.stringify({ unit, expression }).replaceAll("<", "\\u003c");
  fs.writeFileSync(slug + ".html", `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title)} | Посчитай</title>
  <meta name="description" content="${escape(description)}">
  <link rel="canonical" href="${link}">
  <link rel="icon" href="/favicon.ico">
  <link rel="stylesheet" href="assets/style.css">
  <script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
</head>
<body>
<header class="site"><div class="wrap"><a class="logo" href="./"><b>П</b>Посчитай</a><a href="./#remont">Все калькуляторы ремонта</a></div></header>
<main class="wrap">
  <div class="crumbs"><a href="./">Главная</a> / <a href="./#remont">Ремонт и стройка</a></div>
  <div class="calc-head"><div class="ic" aria-hidden="true">${escape(icon)}</div><div><h1>${escape(title)}</h1><p class="lead">${escape(description)}</p></div></div>
  <form class="card" id="f"><div class="grid">
${inputs}
  </div><div class="result" id="out" aria-live="polite"></div></form>
  <h2>Как считается</h2>
  <p>${escape(explanation)}</p>
  ${links.length ? '<h2>Связанные калькуляторы</h2>\n  <div class="tiles">' + links.join("\n") + "</div>" : ""}
</main>
<script type="application/json" id="calculator-spec">${data}</script>
<script src="assets/app.js"></script>
<script src="assets/purchase-calcs.js"></script>
<script src="assets/generated-calculator.js"></script>
</body>
</html>
`);
  const count = (rawCatalogue.match(/^\s*\[/gm) || []).length;
  insert("index.html", '  <a class="tile wow" href="remont-vannoy"', "  " + tile(slug, icon, title, description) + "\n");
  const home = fs.readFileSync("index.html", "utf8");
  assert(home.includes(`data-count="${count}">${count}`));
  fs.writeFileSync("index.html", home.replace(`data-count="${count}">${count}`, `data-count="${count + 1}">${count + 1}`)
    .replace(`${count} калькуляторов ·`, `${count + 1} калькуляторов ·`));
  fs.writeFileSync("assets/app.js", source.replace("const CALCS = [\n",
    "const CALCS = [\n  " + JSON.stringify([icon, title, slug, description]).replaceAll('","', '", "') + ",\n"));
  insert("sitemap.xml", "</urlset>", `  <url><loc>${link}</loc></url>\n`);
  const sw = fs.readFileSync("sw.js", "utf8");
  assert(/const CACHE = "poschitay-v\d+";/.test(sw));
  const assets = sw.includes('"assets/generated-calculator.js"') ? "" : ' "assets/generated-calculator.js",';
  fs.writeFileSync("sw.js", sw.replace(/poschitay-v(\d+)/, (_, version) => "poschitay-v" + (Number(version) + 1))
    .replace("const FILES = [\n", `const FILES = [\n  "${slug}",${assets}\n`));
}

async function main() {
  queue.forEach(validate);
  if (process.argv.includes("--check")) {
    console.log("Контрольные примеры прошли: " + queue.reduce((n, s) => n + s.checks.length, 0));
    return;
  }
  const available = queue.filter(({ slug }) => !exists(slug));
  let spec = available[0];
  if (process.env.MODEL_READY === "true") {
    try {
      if (available.length) {
        const choice = await model("Выбери наиболее полезный калькулятор. Верни JSON с полем slug из списка: " +
          JSON.stringify(available.map(({ slug, title, description }) => ({ slug, title, description }))));
        spec = available.find(({ slug }) => slug === choice.slug) || spec;
      } else {
        const novel = await model("Предложи новый безопасный калькулятор для ремонта или быта. " +
          "Верни JSON строго по образцу с двумя проверочными примерами и токенами формулы (обратная польская нотация). " +
          "Формулой могут быть только операции + - * / ceil floor min max. Не используй медицинские, опасные, финансовые или юридические нормы. " +
          "Не повторяй страницы: " + [...catalogue.keys(), ...proposed].join(", ") + ". Образец: " + JSON.stringify(queue[0]));
        validate(novel);
        assert(!exists(novel.slug), "Модель предложила дубликат");
        spec = novel;
      }
    } catch {
      console.warn("Модель не вернула подходящую спецификацию.");
    }
  }
  if (!spec) return;
  render(spec);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${spec.slug}\ntitle=${spec.title}\n`);
  console.log("Подготовлено: " + spec.slug);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
