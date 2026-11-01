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
  // Обратная связь. Заполните хотя бы одно поле — блоки на странице feedback.html появятся сами.
  contact: {
    yandexForm: "",  // ссылка на Яндекс Форму, например "https://forms.yandex.ru/u/1234567890abcdef/"
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
      slot.innerHTML = '<div class="ad-placeholder">Место для рекламного блока РСЯ (' + slot.dataset.ad + ")</div>";
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
    const url = c.yandexForm + (c.yandexForm.includes("?") ? "&" : "?") + "iframe=1&page=" + encodeURIComponent(document.referrer || location.href);
    box.innerHTML = `<iframe src="${esc(url)}" title="Форма обратной связи" style="width:100%;min-height:620px;border:0" loading="lazy"></iframe>`;
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
      <input type="hidden" name="successURL" value="https://poschitay24.ru/donate.html">
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
