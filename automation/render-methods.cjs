"use strict";

const fs = require("node:fs");
const assert = require("node:assert/strict");
const topics = require("./method-topics.json");
const catalogue = fs.readFileSync("assets/app.js", "utf8").split("const CALCS = [\n")[1].split("\n];")[0];
const slugs = [...catalogue.matchAll(/^\s*\["[^"]*", "[^"]+", "([a-z0-9-]+)",/gm)].map(([, slug]) => slug);
const homepage = fs.readFileSync("index.html", "utf8");
const [, ...sections] = homepage.split(/<div class="section-h[^"]*" id="([a-z]+)">/g);
const sectionTopics = { wow: "everyday", remont: "materials", dengi: "money", zdorovie: "health",
  avto: "travel", den: "everyday", kuchnya: "kitchen", ucheba: "study" };
const calculatorTopics = new Map();
for (let index = 0; index < sections.length; index += 2) {
  const section = sectionTopics[sections[index]];
  if (!section) continue;
  for (const [, slug] of sections[index + 1].matchAll(/<a class="tile[^"]*" href="([a-z0-9-]+)"/g)) {
    calculatorTopics.set(slug, section);
  }
}

const records = new Map();
for (const file of fs.readdirSync("automation").filter((name) => /^sources-.*\.json$/.test(name))) {
  for (const [slug, record] of Object.entries(JSON.parse(fs.readFileSync("automation/" + file, "utf8")))) {
    assert(!records.has(slug), "Две методики для " + slug);
    records.set(slug, record);
  }
}

const sources = {
  materials: "Используйте свои размеры и норму расхода с техлиста выбранного продукта. Примерные значения в полях можно заменить.",
  geometry: "Исходные размеры задаёте вы. Переведите их в указанные единицы и проверьте, какие поверхности или проёмы входят в расчёт.",
  money: "Условия договора, суммы и расчётный период сверяйте по первичным документам. Для ставок и льгот важны год и применимость нормы.",
  health: "Итог зависит от исходных измерений и границ применимости модели. Подробности смотрите в описании расчёта и в источнике.",
  travel: "Расстояние и параметры машины, тарифа или перевозчика берите для своей поездки. Указанные в форме значения могут быть примерами.",
  study: "Исходные числа задаёт условие задачи. Единицы, порядок действий и точность ответа показаны в методике.",
  kitchen: "Используйте пропорции из своего рецепта, фактическую массу ингредиентов или значения с упаковки.",
  everyday: "Используйте свои измерения или значения из квитанции, этикетки и других исходных документов, когда этого требует расчёт."
};

const escape = (text) => text.replace(/[&<>"']/g, (character) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

function linksHtml(links) {
  return links.length ? `<ul class="method-links">${links.map(({ label, url, detail }) => {
    assert(typeof label === "string" && typeof detail === "string" && new URL(url).protocol === "https:");
    return `<li><a href="${escape(url)}">${escape(label)}</a><span>${escape(detail)}</span></li>`;
  }).join("")}</ul>` : "";
}

function guideHtml() {
  const entries = Object.entries(topics);
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Методики и источники калькуляторов | Посчитай</title>
<meta name="description" content="Как считаются площади, материалы, платежи, порции и школьные задачи. Формулы, исходные данные и ссылки на справочники.">
<link rel="canonical" href="https://poschitay24.ru/metodiki">
<link rel="icon" href="/favicon.ico">
<link rel="stylesheet" href="assets/style.css">
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
</head>
<body>
<header class="site"><div class="wrap"><a class="logo" href="./"><b>П</b>Посчитай</a><a href="./">Все калькуляторы</a></div></header>
<main class="wrap method-guide">
  <header>
    <h1>Методики и <span class="grad-text">источники</span></h1>
    <p class="lead">Формулы, исходные данные и допущения, которые влияют на результат.</p>
  </header>
  <nav class="method-index" aria-label="Статьи">${entries.map(([id, topic]) => `<a href="#${id}">${escape(topic.title)}</a>`).join("")}</nav>
  ${entries.map(([id, topic]) => `<article id="${id}" class="method-card">
    <h2>${escape(topic.title)}</h2>
    <p class="method-context">${escape(topic.intro)}</p>
    ${topic.details.map(([title, text]) => `<h3>${escape(title)}</h3><p>${escape(text)}</p>`).join("\n    ")}
    ${linksHtml(topic.links)}
  </article>`).join("\n  ")}
</main>
</body>
</html>
`;
}

function methodHtml(slug, html) {
  const generated = html.match(/<script type="application\/json" id="calculator-spec">([^<]+)<\/script>/);
  const inline = generated ? JSON.parse(generated[1]).method : null;
  const record = records.get(slug) || inline;
  assert(record && typeof record.method === "string" && record.method.trim(), "Не указана методика: " + slug);
  const id = record.source || calculatorTopics.get(slug) || "everyday";
  const topic = topics[id];
  assert(topic, "Неизвестный раздел методики: " + id);
  const links = (record.links || []).filter((link, index, all) => all.findIndex(({ url }) => url === link.url) === index);
  const reference = `<p class="method-link"><a href="metodiki#${id}">${escape(topic.title)} · статья в справочнике</a></p>`;
  const block = `<!-- calculator-method:start -->
<section class="method-card" id="metodika" aria-labelledby="method-title">
  <h2 id="method-title">Методика и источники</h2>
  <p>${escape(record.method)}</p>
  <p class="method-context"><strong>Данные для расчёта.</strong> ${escape(record.inputs || sources[id])}</p>
  ${reference}
  ${links.length ? '<h3>Где сверить данные и допущения</h3>' + linksHtml(links) : ""}
</section>
<!-- calculator-method:end -->
`;
  const marker = /<!-- calculator-method:start -->[\s\S]*?<!-- calculator-method:end -->\n?/;
  if (marker.test(html)) return html.replace(marker, () => block);
  assert((html.match(/<\/main>/g) || []).length === 1, "Разметка калькулятора изменилась: " + slug);
  return html.replace("</main>", () => block + "</main>");
}

const guide = guideHtml();
if (process.argv.includes("--guide")) {
  fs.writeFileSync("metodiki.html", guide);
} else {
  const checkOnly = process.argv.includes("--check");
  assert(slugs.length === (catalogue.match(/^\s*\[/gm) || []).length && new Set(slugs).size === slugs.length,
    "Каталог содержит нераспознанные или повторные адреса");
  for (const slug of records.keys()) assert(slugs.includes(slug), "Методика без калькулятора: " + slug);
  const pages = slugs.map((slug) => {
    const file = slug + ".html";
    return [file, methodHtml(slug, fs.readFileSync(file, "utf8"))];
  });
  if (!checkOnly) {
    for (const [file, html] of pages) fs.writeFileSync(file, html);
    fs.writeFileSync("metodiki.html", guide);
  }
  console.log(`Проверено методик: ${pages.length}. Статей: ${Object.keys(topics).length}.`);
}
