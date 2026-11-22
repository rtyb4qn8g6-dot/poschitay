// Общие правила числового ввода и вывода для калькуляторов покупок.
function up(value) {
  const nearest = Math.round(value);
  return nearest > 0 && Math.abs(value - nearest) <= Number.EPSILON * Math.max(1, value) * 4
    ? nearest : Math.ceil(value);
}
function money(value) { return fmt(value, 2) + " ₽"; }
function result(headline, lines) { return {headline, lines}; }
function comparison(first, second, lines) {
  const diff = Math.round(first * 100) - Math.round(second * 100);
  const headline = diff === 0 ? "Одинаковая стоимость" : "Вариант " + (diff < 0 ? 1 : 2) + " дешевле";
  return result(headline, [...lines, "Разница: " + money(Math.abs(diff) / 100)]);
}
function runEstimate(calculate) {
  const form = document.getElementById("f"), out = document.getElementById("out");
  autoCalc("f", () => {
    try {
      const values = {};
      for (const field of form.querySelectorAll("input[id], select[id]")) {
        const raw = field.value.trim();
        if (!field.hasAttribute("data-lower")) {
          if (!raw) throw Error("Заполните поле «" + field.labels[0].textContent + "».");
          values[field.id] = raw;
          continue;
        }
        const normalized = raw.replace(/\s/g, "").replace(",", ".");
        const value = Number(normalized);
        const min = Number(field.dataset.lower), max = Number(field.dataset.upper);
        if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) || !Number.isFinite(value) ||
            value < min || value > max || (field.inputMode === "numeric" && !Number.isInteger(value))) {
          throw Error("Проверьте поле «" + field.labels[0].textContent + "»: от " + fmt(min, 3) + " до " + fmt(max) + ".");
        }
        values[field.id] = value;
      }
      const {headline, lines} = calculate(values);
      const title = document.createElement("div"), list = document.createElement("ul");
      title.className = "big";
      title.textContent = headline;
      for (const line of lines) {
        const li = document.createElement("li");
        li.textContent = line;
        list.appendChild(li);
      }
      out.replaceChildren(title, list);
    } catch (error) {
      out.textContent = error.message;
    }
  });
}
