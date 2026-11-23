"use strict";
const fs = require("node:fs");
const evaluate = require("../assets/generated-calculator.js");
const assert = require("node:assert/strict");

const sections = {
  ucheba: { name: "Учёба", first: '  <a class="tile" href="drobi"' },
  den: { name: "Дом и каждый день", first: '  <a class="tile" href="perevod-edinic"' },
  remont: { name: "Ремонт и стройка", first: '  <a class="tile wow" href="remont-vannoy"' },
  kuhnya: { name: "Кухня", first: '  <a class="tile" href="recept-porcii"' },
  avto: { name: "Авто и поездки", first: '  <a class="tile" href="rashod-topliva"' }
};
const queues = [
  ["calculators.json", "remont"], ["batch-remont.json", "remont"],
  ["batch-kuhnya.json", "kuhnya"], ["batch-poezdki.json", "avto"], ["batch-cifry.json", "den"], ["batch-ucheba.json", "ucheba"]
];
const queue = queues.flatMap(([file, section]) => {
  const path = "automation/" + file;
  return fs.existsSync(path)
    ? JSON.parse(fs.readFileSync(path)).map((spec) => ({ ...spec, section }))
    : [];
});
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
  for (const { id, label, min, max, value, integer } of fields) {
    assert(typeof id === "string" && fieldPattern.test(id) && !["f", "out", "constructor", "prototype"].includes(id) && !ids.has(id));
    assert(typeof label === "string" && label.trim() && label.length <= 96 && !/[\r\n]/.test(label));
    assert([min, max, value].every(Number.isFinite) && min >= 0 && min < max && max <= 1e8 && min <= value && value <= max);
    assert(integer === undefined || typeof integer === "boolean" && (!integer || [min, max, value].every(Number.isInteger)));
    ids.add(id);
  }
  assert(Array.isArray(expression) && expression.length <= 60 && expression.every((token) => typeof token === "string" && token.length <= 32));
  assert(Array.isArray(checks) && checks.length >= 2 && checks.length <= 6);
  assert(new Set(checks.map(({ values }) => JSON.stringify([...ids].map((id) => values[id])))).size >= 2);
  assert(Array.isArray(related) && related.length <= 4 && related.every((id) => catalogue.has(id)));
  for (const { values, expected } of checks) {
    assert(Object.keys(values).length === ids.size && Number.isFinite(expected));
    for (const { id, min, max, integer } of fields) assert(Number.isFinite(values[id]) && min <= values[id] && values[id] <= max && (!integer || Number.isInteger(values[id])));
    assert(Math.abs(evaluate(expression, values) - expected) <= Math.max(1, Math.abs(expected)) * 1e-9, "Контрольный пример не сошёлся");
  }
  const defaultResult = evaluate(expression, Object.fromEntries(fields.map(({ id, value }) => [id, value])));
  assert(Number.isFinite(defaultResult));
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
  const { slug, title, icon, description, explanation, fields, unit, expression, related, section, checks } = spec;
  const category = sections[section];
  const link = "https://poschitay24.ru/" + slug;
  const inputs = fields.map(({ id, label, min, max, value, integer }) =>
    `    <div><label for="${id}">${escape(label)}</label><input id="${id}" inputmode="${integer ? "numeric" : "decimal"}" data-lower="${min}" data-upper="${max}" value="${value}"></div>`).join("\n");
  const tile = (id, glyph, name, detail) => `<a class="tile" href="${id}"><span class="ico">${escape(glyph)}</span><b>${escape(name)}</b>${detail ? "<small>" + escape(detail) + "</small>" : ""}</a>`;
  const links = [...new Set(related)].map((id) => tile(id, catalogue.get(id).icon, catalogue.get(id).title));
  const methodSources = { remont: "materials", ucheba: "study", avto: "travel", kuchnya: "kitchen", den: "everyday" };
  const method = { method: explanation, source: methodSources[section] };
  const data = JSON.stringify({ unit, expression, method }).replaceAll("<", "\\u003c");
  const example = checks[0];
  const exampleNumber = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 4 });
  const exampleFields = fields.map(({ id, label }) =>
    `${escape(label)} — ${exampleNumber.format(example.values[id])}`).join(" · ");
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
<header class="site"><div class="wrap"><a class="logo" href="./"><b>П</b>Посчитай</a><a href="./#${section}">${category.name}</a></div></header>
<main class="wrap">
  <div class="crumbs"><a href="./">Главная</a> / <a href="./#${section}">${category.name}</a></div>
  <div class="calc-head"><div class="ic" aria-hidden="true">${escape(icon)}</div><div><h1>${escape(title)}</h1><p class="lead">${escape(description)}</p></div></div>
  <form class="card" id="f"><div class="grid">
${inputs}
  </div><div class="result" id="out" aria-live="polite"></div></form>
  <h2>Как считается</h2>
  <p>${escape(explanation)}</p>
  <h2>Пример расчёта</h2>
  <p>${exampleFields}. Результат — <strong>${exampleNumber.format(example.expected)} ${escape(unit)}</strong>.</p>
  ${links.length ? '<h2>Связанные калькуляторы</h2>\n  <div class="tiles">' + links.join("\n") + "</div>" : ""}
</main>
<script type="application/json" id="calculator-spec">${data}</script>
<script src="assets/app.js"></script>
<script src="assets/purchase-calcs.js"></script>
<script src="assets/generated-calculator.js"></script>
</body>
</html>
`);
  return { slug, title, icon, description, link, section, tile: tile(slug, icon, title, description) };
}

function renderBatch(specs) {
  const pages = specs.map(render);
  const count = (rawCatalogue.match(/^\s*\[/gm) || []).length;
  const updated = count + pages.length;
  for (const [section, category] of Object.entries(sections)) {
    const tiles = pages.filter((page) => page.section === section).map((page) => "  " + page.tile + "\n").join("");
    if (tiles) insert("index.html", category.first, tiles);
  }
  const home = fs.readFileSync("index.html", "utf8");
  assert(home.includes(`data-count="${count}">${count}`));
  fs.writeFileSync("index.html", home.replace(`data-count="${count}">${count}`, `data-count="${updated}">${updated}`)
    .replace(`${count} калькуляторов ·`, `${updated} калькуляторов ·`));
  fs.writeFileSync("assets/app.js", source.replace("const CALCS = [\n",
    "const CALCS = [\n" + pages.map(({ icon, title, slug, description }) =>
      "  [" + [icon, title, slug, description].map((field) => JSON.stringify(field)).join(", ") + "],\n").join("")));
  insert("sitemap.xml", "</urlset>", pages.map(({ link }) => `  <url><loc>${link}</loc></url>\n`).join(""));
  const sw = fs.readFileSync("sw.js", "utf8");
  assert(/const CACHE = "poschitay-v\d+";/.test(sw));
  const assets = sw.includes('"assets/generated-calculator.js"') ? "" : ' "assets/generated-calculator.js",';
  fs.writeFileSync("sw.js", sw.replace(/poschitay-v(\d+)/, (_, version) => "poschitay-v" + (Number(version) + 1))
    .replace("const FILES = [\n", `const FILES = [\n  ${pages.map(({ slug }) => JSON.stringify(slug)).join(", ")},${assets}\n`));
}

async function main() {
  assert(new Set(queue.map(({ slug }) => slug)).size === queue.length, "Дубли адресов в очереди");
  queue.forEach(validate);
  const available = queue.filter(({ slug }) => !catalogue.has(slug) && !fs.existsSync(slug + ".html"));
  if (process.argv.includes("--pending")) {
    console.log(available.length);
    return;
  }
  if (process.argv.includes("--check")) {
    console.log("Контрольные примеры прошли: " + queue.reduce((n, s) => n + s.checks.length, 0));
    return;
  }
  const vetted = available.length > 0;
  const specs = [...available];
  if (!vetted && process.env.DRAFT_ACTIVE !== "true" && process.env.MODEL_READY === "true") {
    for (const topic of ["домашний ремонт", "хранение и организация дома", "еда и покупки без финансовых советов"]) {
      try {
        const candidate = await model("Предложи новый бытовой калькулятор по теме: " + topic +
          ". Верни JSON по образцу. Формула в обратной польской нотации (+ - * / ceil floor min max). " +
          "Дай два проверочных примера и раскрытые допущения. Не используй медицинские, опасные, финансовые или юридические нормы. " +
          "Не повторяй страницы: " + [...catalogue.keys(), ...proposed].join(", ") + ". Образец: " + JSON.stringify(queue[0]));
        validate(candidate);
        assert(!exists(candidate.slug), "Модель предложила дубликат");
        specs.push({ ...candidate, section: topic.startsWith("еда") ? "kuhnya" : "remont" });
        proposed.add(candidate.slug);
      } catch {
        console.warn("Модель не вернула подходящую спецификацию по теме: " + topic);
      }
    }
  }
  if (!specs.length) return;
  renderBatch(specs);
  const slugs = specs.map(({ slug }) => slug);
  const output = `slug=${slugs[0]}\nslugs=${slugs.join(" ")}\ncount=${slugs.length}\nvetted=${vetted}\n`;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  console.log("Подготовлено: " + slugs.join(", "));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
