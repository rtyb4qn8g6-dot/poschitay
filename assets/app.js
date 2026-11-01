/* Общие настройки и помощники для всех страниц сайта. */

/* ===== НАСТРОЙКИ МОНЕТИЗАЦИИ ===== */
const CONFIG = {
  // Рекламная сеть Яндекса (РСЯ). После одобрения сайта в partner.yandex.ru
  // впишите сюда ID блоков вида "R-A-1234567-1" и поставьте enabled: true.
  yandexAds: {
    enabled: false,
    blocks: {
      top: "",     // блок над калькулятором
      result: "",  // блок под результатом расчёта (самый доходный)
      bottom: "",  // блок внизу страницы
    },
  },
  // Партнёрские (CPA) ссылки: Admitad, Advcake, партнёрки банков и магазинов.
  // Пустой url — показывается заглушка.
  partners: {
    tile:      { text: "Купить плитку с доставкой", url: "", note: "Партнёрская ссылка на магазин стройматериалов" },
    wallpaper: { text: "Подобрать обои и клей", url: "", note: "Партнёрская ссылка на магазин стройматериалов" },
    laminate:  { text: "Ламинат и подложка со скидкой", url: "", note: "Партнёрская ссылка на магазин стройматериалов" },
    npd:       { text: "Банк для самозанятых: бесплатная карта и чеки", url: "", note: "Партнёрская программа банка" },
    usn:       { text: "Открыть счёт для ИП бесплатно", url: "", note: "Партнёрская программа банка или онлайн-бухгалтерии" },
    paint:     { text: "Краска и грунтовка с доставкой", url: "", note: "Партнёрская ссылка на магазин стройматериалов" },
    concrete:  { text: "Заказать бетон с завода", url: "", note: "Партнёрская ссылка на поставщика бетона" },
    plaster:   { text: "Штукатурка и маяки по выгодной цене", url: "", note: "Партнёрская ссылка на магазин стройматериалов" },
    ndfl:      { text: "Брокерский счёт / ИИС с налоговыми льготами", url: "", note: "Партнёрская программа брокера" },
    vacation:  { text: "Туры и отели со скидкой", url: "", note: "Партнёрская ссылка на сервис путешествий" },
    sick:      { text: "Онлайн-консультация врача", url: "", note: "Партнёрская ссылка на сервис телемедицины" },
    brick:     { text: "Кирпич с доставкой на объект", url: "", note: "Партнёрская ссылка на поставщика стройматериалов" },
    gasblock:  { text: "Газобетон от производителя", url: "", note: "Партнёрская ссылка на поставщика стройматериалов" },
    insulation:{ text: "Утеплитель по выгодной цене", url: "", note: "Партнёрская ссылка на магазин стройматериалов" },
    mortgage:  { text: "Подобрать ипотеку с низкой ставкой", url: "", note: "Партнёрская ссылка на сервис подбора ипотеки" },
    credit:    { text: "Сравнить кредиты в разных банках", url: "", note: "Партнёрская ссылка на финансовый маркетплейс" },
    deposit:   { text: "Вклады с самой высокой ставкой", url: "", note: "Партнёрская ссылка на финансовый маркетплейс" },
    alimony:   { text: "Консультация семейного юриста онлайн", url: "", note: "Партнёрская ссылка на юридический сервис" },
    property:  { text: "Ипотека: сравнить ставки банков", url: "", note: "Партнёрская ссылка на сервис подбора ипотеки" },
  },
  // Обратная связь. Заполните хотя бы одно поле — блоки на странице obratnaya-svyaz появятся сами.
  contact: {
    yandexForm: "https://forms.yandex.ru/u/6ae732d3c45c0716765db93b/",  // ссылка на Яндекс Форму, например "https://forms.yandex.ru/u/1234567890abcdef/"
    email: "",       // почта для писем, например "hello@poschitay24.ru"
    telegram: "",    // ник в Telegram без @, например "poschitay24"
  },
  // Донаты. Заполните то, что подключите.
  donate: {
    yoomoney: "4100116254637048",    // номер кошелька ЮMoney, например "4100118000000000"
    cloudtips: "https://pay.cloudtips.ru/p/674bc79f",   // ссылка CloudTips, например "https://pay.cloudtips.ru/p/abcd1234"
    boosty: "",      // ссылка на Boosty, например "https://boosty.to/poschitay"
  },
};

/* ===== Реклама ===== */
function renderAds() {
  const slots = document.querySelectorAll("[data-ad]");
  const cfg = CONFIG.yandexAds;
  if (cfg.enabled) {
    window.yaContextCb = window.yaContextCb || [];
    const s = document.createElement("script");
    s.src = "https://yandex.ru/ads/system/context.js";
    s.async = true;
    document.head.appendChild(s);
  }
  slots.forEach((slot) => {
    const blockId = cfg.blocks[slot.dataset.ad];
    if (!cfg.enabled || !blockId) {
      // Пока реклама не подключена — блок не показываем. Для просмотра мест под рекламу добавьте к адресу ?ads=1
      if (/[?&]ads=1/.test(location.search)) slot.innerHTML = '<div class="ad-placeholder">Место для рекламного блока РСЯ (' + slot.dataset.ad + ")</div>";
      else slot.style.display = "none";
      return;
    }
    const id = "yandex_rtb_" + blockId + "_" + slot.dataset.ad;
    slot.innerHTML = '<div id="' + id + '"></div>';
    window.yaContextCb.push(() => {
      Ya.Context.AdvManager.render({ blockId: blockId, renderTo: id });
    });
  });
}

/* ===== Партнёрские блоки ===== */
function renderPartners() {
  document.querySelectorAll("[data-partner]").forEach((el) => {
    const p = CONFIG.partners[el.dataset.partner];
    if (!p) return;
    // Без настоящей ссылки блок не показываем (просмотр заглушек — ?ads=1)
    if (!p.url && !/[?&]ads=1/.test(location.search)) { el.style.display = "none"; return; }
    const link = p.url
      ? '<a href="' + p.url + '" target="_blank" rel="sponsored noopener">' + p.text + " →</a>"
      : "<b>" + p.text + "</b> (здесь будет партнёрская ссылка)";
    el.innerHTML = '<div class="partner">' + link + "<small>" + p.note + "</small></div>";
  });
}

/* ===== Помощники для калькуляторов ===== */
function num(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const v = parseFloat(String(el.value).replace(",", ".").replace(/\s/g, ""));
  return isFinite(v) ? v : 0;
}

function fmt(n, digits = 0) {
  return Number(n).toLocaleString("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function rub(n) {
  return fmt(Math.round(n)) + " ₽";
}

/* Пересчитывать при любом изменении полей формы. */
function autoCalc(formId, fn) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("input", fn);
  form.addEventListener("change", fn);
  form.addEventListener("submit", (e) => { e.preventDefault(); fn(); });
  fn();
}

document.addEventListener("DOMContentLoaded", () => {
  renderAds();
  renderPartners();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
});

/* ===== Мобильная версия ===== */
const isPhone = () => window.matchMedia("(max-width: 640px)").matches;

/* Пробелы между разрядами в полях: 1500000 → 1 500 000 */
function groupDigits(v) {
  const m = String(v).replace(/\s/g, "").match(/^(\d+)([.,]\d*)?$/);
  if (!m || m[1].length < 4) return v;
  return m[1].replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (m[2] || "");
}
function setupNumberInputs() {
  document.querySelectorAll('input[inputmode="decimal"], input[inputmode="numeric"]').forEach((el) => {
    el.value = groupDigits(el.value);
    el.addEventListener("blur", () => { el.value = groupDigits(el.value); });
    el.addEventListener("focus", () => { el.select(); });
  });
}

/* Нижняя панель с главным результатом, пока сам блок результата не виден */
function setupResultBar() {
  const out = document.getElementById("out");
  if (!out) return;
  const bar = document.createElement("button");
  bar.type = "button";
  bar.className = "result-bar";
  bar.innerHTML = '<span><span class="rb-label"></span><span class="rb-value"></span></span><span class="rb-go">Подробнее ↓</span>';
  document.body.appendChild(bar);
  bar.addEventListener("click", () => out.scrollIntoView({ behavior: "smooth", block: "center" }));

  let outVisible = false;
  const refresh = () => {
    const big = out.querySelector(".big");
    if (big) {
      const label = (out.firstChild && out.firstChild.nodeType === 3 ? out.firstChild.textContent : "").trim().replace(/:$/, "");
      bar.querySelector(".rb-label").textContent = label;
      bar.querySelector(".rb-value").textContent = big.textContent;
    }
    bar.classList.toggle("show", !!big && !outVisible && isPhone());
  };
  new MutationObserver(refresh).observe(out, { childList: true, subtree: true, characterData: true });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((e) => { outVisible = e[0].isIntersecting; refresh(); }).observe(out);
  }
  window.addEventListener("resize", refresh);
  refresh();
}

/* Поиск калькулятора на главной */
function setupSearch() {
  const input = document.getElementById("search");
  if (!input) return;
  const tiles = [...document.querySelectorAll(".tile")];
  const norm = (s) => s.toLowerCase().replace(/ё/g, "е");
  input.addEventListener("input", () => {
    const q = norm(input.value.trim());
    let shown = 0;
    tiles.forEach((t) => {
      const hit = !q || norm(t.textContent).includes(q);
      t.style.display = hit ? "" : "none";
      if (hit) shown++;
    });
    document.querySelectorAll(".tiles").forEach((g) => {
      const any = [...g.children].some((c) => c.style.display !== "none");
      g.style.display = any ? "" : "none";
      if (g.previousElementSibling && g.previousElementSibling.tagName === "H2") g.previousElementSibling.style.display = any ? "" : "none";
    });
    document.getElementById("nothing").style.display = shown ? "none" : "block";
  });
}

/* Кнопка «Установить» (Android/Chrome). На iPhone — через «Поделиться → На экран „Домой“». */
let installEvent = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvent = e;
  const btn = document.querySelector(".install-btn");
  if (btn) btn.classList.add("show");
});
function setupInstallButton() {
  const wrap = document.querySelector("header.site .wrap");
  if (!wrap) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "install-btn";
  btn.textContent = "Установить";
  btn.addEventListener("click", async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    installEvent = null;
    btn.classList.remove("show");
  });
  wrap.appendChild(btn);
  if (installEvent) btn.classList.add("show");
}

document.addEventListener("DOMContentLoaded", () => {
  setupNumberInputs();
  setupResultBar();
  setupSearch();
  setupInstallButton();
});


/* ===== Обратная связь и донаты ===== */
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function setupFeedback() {
  const box = document.getElementById("feedback-box");
  if (!box) return;
  const c = CONFIG.contact;
  const direct = [];
  if (c.email) direct.push(`<a href="mailto:${esc(c.email)}">✉️ ${esc(c.email)}</a>`);
  if (c.telegram) direct.push(`<a href="https://t.me/${esc(c.telegram)}" target="_blank" rel="noopener">💬 Telegram @${esc(c.telegram)}</a>`);
  document.getElementById("direct-contacts").innerHTML = direct.length
    ? "Или напишите напрямую: " + direct.join(" · ") : "";

  if (c.yandexForm) {
    // Официальный способ встраивания Яндекс Форм: ?iframe=1 + embed.js для автовысоты
    const id = (c.yandexForm.match(/\/u\/([^/?#]+)/) || [])[1] || "form";
    const url = c.yandexForm.replace(/\/?$/, "/") + "?iframe=1";
    box.innerHTML = `<div class="card" style="padding:0;overflow:hidden"><iframe src="${esc(url)}" name="ya-form-${esc(id)}" title="Форма обратной связи" style="width:100%;min-height:640px;border:0;display:block"></iframe></div>`;
    const sc = document.createElement("script");
    sc.src = "https://forms.yandex.ru/_static/embed.js";
    sc.async = true;
    document.body.appendChild(sc);
    return;
  }
  const form = document.getElementById("fb-form");
  if (!c.email) {
    form.querySelector("button").disabled = true;
    document.getElementById("fb-note").textContent = "Форма скоро заработает. Владелец сайта ещё не подключил приём сообщений.";
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!c.email) return;
    const f = new FormData(form);
    const body = `${f.get("msg")}\n\n---\nИмя: ${f.get("name") || "-"}\nКонтакт для ответа: ${f.get("reply") || "-"}\nСтраница: ${document.referrer || "-"}`;
    location.href = `mailto:${c.email}?subject=${encodeURIComponent("Посчитай: " + f.get("type"))}&body=${encodeURIComponent(body)}`;
    document.getElementById("fb-note").textContent = "Откроется ваше почтовое приложение с готовым письмом — нажмите «Отправить». Спасибо!";
  });
}

function setupDonate() {
  const box = document.getElementById("donate-box");
  if (!box) return;
  const d = CONFIG.donate;
  const parts = [];
  if (d.yoomoney) {
    parts.push(`<form method="POST" action="https://yoomoney.ru/quickpay/confirm" target="_blank" class="card donate-yoo">
      <b>Картой или через ЮMoney</b>
      <input type="hidden" name="receiver" value="${esc(d.yoomoney)}">
      <input type="hidden" name="quickpay-form" value="button">
      <input type="hidden" name="label" value="donate-poschitay24">
      <input type="hidden" name="paymentType" value="AC">
      <input type="hidden" name="successURL" value="https://poschitay24.ru/podderzhat">
      <div class="chips">
        ${[100, 300, 500, 1000].map((v, i) => `<label class="chip"><input type="radio" name="sum" value="${v}" ${i === 1 ? "checked" : ""}> ${v} ₽</label>`).join("")}
      </div>
      <button type="submit" class="btn">☕ Поддержать</button>
    </form>`);
  }
  if (d.cloudtips) parts.push(`<a class="btn" href="${esc(d.cloudtips)}" target="_blank" rel="noopener">💳 Поддержать любой суммой</a><p class="note">Оплата картой любого банка через защищённый сервис CloudTips (Т-Банк).</p>`);
  if (d.boosty) parts.push(`<a class="btn btn-light" href="${esc(d.boosty)}" target="_blank" rel="noopener">⭐ Подписка на Boosty</a>`);
  box.innerHTML = parts.length ? parts.join("\n")
    : '<div class="ad-placeholder">Способы поддержки скоро появятся. Спасибо, что заглянули!</div>';
}

document.addEventListener("DOMContentLoaded", () => { setupFeedback(); setupDonate(); });

/* ===== Поделиться расчётом ===== */
// Значения из ссылки (?len=4&wid=3…) подставляются в форму ДО первого расчёта.
(function prefillFromUrl() {
  const form = document.getElementById("f");
  if (!form || !location.search) return;
  const params = new URLSearchParams(location.search);
  params.forEach((v, k) => {
    const el = form.querySelector("#" + CSS.escape(k));
    if (!el) return;
    if (el.type === "checkbox") el.checked = v === "1";
    else el.value = v;
  });
})();

function shareUrl() {
  const form = document.getElementById("f");
  const params = new URLSearchParams();
  form.querySelectorAll("input[id], select[id]").forEach((el) => {
    if (el.type === "checkbox") { if (el.checked) params.set(el.id, "1"); return; }
    const v = String(el.value).replace(/\s/g, "");
    if (v !== "") params.set(el.id, v);
  });
  return location.origin + location.pathname + "?" + params.toString();
}

function toast(text) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2200);
}

function goal(name) { try { ym(113981008, "reachGoal", name); } catch (e) {} }

function setupResultTools() {
  const out = document.getElementById("out");
  if (!out || !document.getElementById("f")) return;
  const tools = document.createElement("div");
  tools.className = "result-tools";
  tools.innerHTML = '<button type="button" class="tool-btn" data-act="share">🔗 Поделиться расчётом</button>' +
                    '<button type="button" class="tool-btn" data-act="print">🖨 Сохранить в PDF</button>';
  out.after(tools);
  tools.addEventListener("click", async (e) => {
    const act = e.target.dataset.act;
    if (act === "share") {
      const url = shareUrl();
      const big = out.querySelector(".big");
      const text = document.title.split(" — ")[0] + (big ? ": " + big.textContent : "");
      goal("share");
      if (navigator.share) {
        try { await navigator.share({ title: document.title, text, url }); return; } catch (err) { if (err.name === "AbortError") return; }
      }
      try { await navigator.clipboard.writeText(url); toast("Ссылка скопирована — отправьте её кому угодно"); }
      catch (err) { prompt("Скопируйте ссылку:", url); }
    }
    if (act === "print") { goal("print"); window.print(); }
  });
  const pf = document.createElement("div");
  pf.className = "print-footer";
  window.addEventListener("beforeprint", () => {
    pf.textContent = "Расчёт выполнен на poschitay24.ru · " + new Date().toLocaleDateString("ru-RU") + " · Ссылка: " + shareUrl();
  });
  tools.after(pf);
}

/* ===== Тёмная тема ===== */
function setupThemeToggle() {
  const wrap = document.querySelector("header.site .wrap");
  if (!wrap) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "theme-btn";
  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === "dark" : true;
  };
  const paint = () => {
    btn.textContent = isDark() ? "☀️" : "🌙";
    btn.title = btn.ariaLabel = isDark() ? "Светлая тема" : "Тёмная тема";
  };
  btn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    paint();
  });
  const install = wrap.querySelector(".install-btn");
  wrap.insertBefore(btn, install || null);
  paint();
}

document.addEventListener("DOMContentLoaded", () => { setupResultTools(); setupThemeToggle(); });


/* ===== Каталог калькуляторов (поиск ⌘K и подсказки на главной) ===== */
const CALCS = [
  ["🧬", "Жизнь в цифрах", "zhizn-v-cifrah", "возраст сердце марс дни рождения удивительное"],
  ["⏳", "Настоящая цена покупки", "nastoyashchaya-cena", "кофе привычка часы работы удивительное"],
  ["🏝️", "Когда можно не работать", "finansovaya-svoboda", "пенсия капитал свобода fire удивительное"],
  ["🏦", "Ипотека", "ipoteka", "кредит жильё квартира платёж"],
  ["💳", "Кредит", "kredit", "займ платёж график погашения"],
  ["💰", "Вклад", "vklad", "депозит проценты капитализация"],
  ["💼", "НДФЛ и зарплата на руки", "ndfl", "налог доход зарплата"],
  ["🏖️", "Отпускные", "otpusknye", "отпуск средний заработок"],
  ["🤒", "Больничный", "bolnichnyy", "пособие нетрудоспособность"],
  ["🏠", "Вычет за квартиру", "nalogovyy-vychet", "налог возврат ндфл имущественный"],
  ["👨‍👧", "Алименты", "alimenty", "дети"],
  ["🧾", "Налог самозанятого", "samozanyatye", "нпд самозанятость"],
  ["📊", "Налоги ИП на УСН", "nalogi-ip-usn", "упрощёнка взносы ип"],
  ["💯", "Проценты", "procenty", "процент скидка наценка ндс"],
  ["📅", "Дни между датами", "dni-mezhdu-datami", "дата срок рабочие дни"],
  ["🧱", "Плитка", "plitka", "кафель ванная пол стены"],
  ["🧻", "Обои", "oboi", "рулоны стены"],
  ["🪵", "Ламинат", "laminat", "пол упаковки"],
  ["🎨", "Краска", "kraska", "покраска стены потолок"],
  ["🪣", "Штукатурка", "shtukaturka", "стены выравнивание"],
  ["🏗️", "Бетон", "beton", "фундамент цемент плита"],
  ["🧱", "Кирпич", "kirpich", "кладка стены"],
  ["🔲", "Газобетон", "gazobeton", "блоки газосиликат"],
  ["🧶", "Утеплитель", "uteplitel", "минвата пенопласт"],
];
const normQ = (t) => t.toLowerCase().replace(/ё/g, "е");
function findCalcs(q) {
  q = normQ(q.trim());
  return q ? CALCS.filter((c) => normQ(c[1] + " " + c[3]).includes(q)) : CALCS.slice(0, 8);
}
function renderList(box, list) {
  box.innerHTML = list.length
    ? list.map((c, i) => `<a href="${c[2]}" class="${i ? "" : "active"}"><span class="em">${c[0]}</span>${c[1]}<small>↵</small></a>`).join("")
    : '<a href="obratnaya-svyaz" class="active"><span class="em">💡</span>Такого пока нет — предложить калькулятор<small>→</small></a>';
}
function keyNav(input, box) {
  input.addEventListener("keydown", (e) => {
    const items = [...box.querySelectorAll("a")];
    let i = items.findIndex((a) => a.classList.contains("active"));
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); items[i]?.classList.remove("active");
      i = (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[i]?.classList.add("active"); items[i]?.scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter" && items[i]) { e.preventDefault(); location.href = items[i].getAttribute("href"); }
  });
}

function setupPalette() {
  const inline = document.getElementById("q");
  const pal = document.createElement("div");
  pal.className = "palette";
  pal.innerHTML = '<div class="palette-box" role="dialog" aria-label="Поиск калькулятора"><input type="search" placeholder="Найти калькулятор…" autocomplete="off"><div class="palette-list"></div></div>';
  document.body.appendChild(pal);
  const input = pal.querySelector("input"), list = pal.querySelector(".palette-list");
  const open = () => {
    if (inline) { inline.focus(); inline.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    pal.classList.add("open"); input.value = ""; renderList(list, findCalcs("")); setTimeout(() => input.focus(), 10);
  };
  const close = () => pal.classList.remove("open");
  input.addEventListener("input", () => renderList(list, findCalcs(input.value)));
  keyNav(input, list);
  pal.addEventListener("click", (e) => { if (e.target === pal) close(); });
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); }
    if (e.key === "Escape") close();
  });
  document.querySelectorAll("[data-open-search]").forEach((b) => b.addEventListener("click", open));

  // Подсказки в большом поиске на главной
  const sug = document.getElementById("suggest");
  if (inline && sug) {
    const show = () => { renderList(sug, findCalcs(inline.value)); sug.classList.add("show"); };
    inline.addEventListener("input", show);
    inline.addEventListener("focus", show);
    inline.addEventListener("blur", () => setTimeout(() => sug.classList.remove("show"), 160));
    keyNav(inline, sug);
  }
}

/* ===== Ползунки для полей с data-min / data-max ===== */
function setupSliders() {
  document.querySelectorAll("input[data-min][data-max]").forEach((inp) => {
    const r = document.createElement("input");
    r.type = "range"; r.min = inp.dataset.min; r.max = inp.dataset.max; r.step = inp.dataset.step || 1;
    r.setAttribute("aria-label", inp.labels?.[0]?.textContent || "Ползунок");
    const paint = () => { const p = (r.value - r.min) / (r.max - r.min) * 100;
      r.style.background = `linear-gradient(90deg, var(--violet) ${p}%, var(--line) ${p}%)`; };
    const fromInput = () => { r.value = num(inp.id) || 0; paint(); };
    r.addEventListener("input", () => {
      inp.value = groupDigits(String(+r.value).replace(".", ","));
      paint();
      inp.dispatchEvent(new Event("input", { bubbles: true }));
    });
    inp.addEventListener("input", fromInput);
    inp.after(r);
    fromInput();
  });
}

/* Подсветка плиток под курсором */
function setupGlow() {
  document.querySelectorAll(".tile, .bcard").forEach((c) => c.addEventListener("pointermove", (e) => {
    const b = c.getBoundingClientRect();
    c.style.setProperty("--mx", e.clientX - b.left + "px"); c.style.setProperty("--my", e.clientY - b.top + "px");
  }));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .1 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

document.addEventListener("DOMContentLoaded", () => { setupPalette(); setupSliders(); setupGlow(); });

/* Раскладка формы: поля слева, всё остальное (результат, кнопки, партнёр) — в правой колонке */
document.addEventListener("DOMContentLoaded", () => {
  const f = document.getElementById("f");
  if (!f || f.querySelector(".side")) return;
  const side = document.createElement("div");
  side.className = "side";
  [...f.children].forEach((el) => { if (!el.classList.contains("grid") && el.id !== "facts") side.appendChild(el); });
  const facts = document.getElementById("facts");
  f.insertBefore(side, facts && facts.parentNode === f ? facts : null);
  if (facts) f.classList.add("has-facts"); // под формой карточки на всю ширину — правую колонку не «приклеиваем»
});
