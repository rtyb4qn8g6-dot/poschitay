"use strict";

(function () {
  class Rational {
    constructor(n, d = 1n) {
      if (d === 0n) throw Error("Делить на ноль нельзя.");
      if (d < 0n) [n, d] = [-n, -d];
      let a = n < 0n ? -n : n;
      let b = d;
      while (b) [a, b] = [b, a % b];
      this.n = n / a;
      this.d = d / a;
      if (String(this.n).length + String(this.d).length > 160) {
        throw Error("Числа в промежуточном результате слишком велики.");
      }
    }

    add(r) { return new Rational(this.n * r.d + r.n * this.d, this.d * r.d); }
    sub(r) { return this.add(r.neg()); }
    mul(r) { return new Rational(this.n * r.n, this.d * r.d); }
    div(r) { return new Rational(this.n * r.d, this.d * r.n); }
    neg() { return new Rational(-this.n, this.d); }
    text() { return this.d === 1n ? String(this.n) : this.n + "/" + this.d; }
  }

  const zero = new Rational(0n);
  const one = new Rational(1n);
  const two = new Rational(2n);
  const four = new Rational(4n);
  const trim = (p) => {
    while (p.length > 1 && p.at(-1).n === 0n) p.pop();
    return p;
  };

  function operate(op, a, b) {
    if (op === "+" || op === "-") {
      return trim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => {
        const left = a[i] || zero;
        const right = b[i] || zero;
        return op === "+" ? left.add(right) : left.sub(right);
      }));
    }
    if (op === "*") {
      const result = Array(a.length + b.length - 1).fill(zero);
      a.forEach((x, i) => b.forEach((y, j) => { result[i + j] = result[i + j].add(x.mul(y)); }));
      trim(result);
      if (result.length > 3) throw Error("Поддерживаются уравнения до второй степени.");
      return result;
    }
    if (op === "/") {
      if (b.length > 1) throw Error("Деление на выражение с x пока не поддерживается.");
      return a.map((x) => x.div(b[0]));
    }
    if (b.length > 1 || b[0].d !== 1n || b[0].n < 0n || b[0].n > 12n) {
      throw Error("Степень должна быть целым числом от 0 до 12.");
    }
    let result = [one];
    for (let i = 0n; i < b[0].n; i++) result = operate("*", result, a);
    return result;
  }

  function polyText(p, linear = false) {
    let text = "";
    for (let i = p.length - 1; i >= 0; i--) {
      const c = p[i];
      if (c.n === 0n) continue;
      const positive = c.n < 0n ? c.neg() : c;
      const number = i && positive.n === positive.d ? "" : positive.text();
      text += (c.n < 0n ? (text ? " − " : "−") : (text ? " + " : "")) +
        number + (i === 2 ? (linear ? "y" : "x²") : i === 1 ? "x" : "");
    }
    return text || "0";
  }

  const numbers = /^(?:\d+(?:\.\d+)?|\.\d+)$/;
  const symbols = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^" };
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 4 };
  const operand = (p, linear) => {
    const text = polyText(p, linear);
    return p.length > 1 || p[0].n < 0n || p[0].d !== 1n ? "(" + text + ")" : text;
  };

  function tokenize(text) {
    const normalized = text.toLowerCase().replace(/\s+/g, "").replace(/[ху×·⋅÷−–,²³]/g, (symbol) =>
      ({ "х": "x", "у": "y", "×": "*", "·": "*", "⋅": "*", "÷": "/", "−": "-", "–": "-", ",": ".", "²": "^2", "³": "^3" })[symbol]);
    const trimmed = normalized.endsWith("=") && normalized.indexOf("=") === normalized.length - 1
      ? normalized.slice(0, -1) : normalized;
    if (!trimmed || trimmed.length > 140) throw Error("Введите один пример длиной до 140 символов.");
    const tokens = trimmed.match(/(?:\d+(?:\.\d+)?|\.\d+)|sqrt|[xy√+*/^=()-]/g) || [];
    if (tokens.join("") !== trimmed) throw Error("Проверьте символы. Можно вводить числа, x, y, корни, скобки и знаки +, −, ×, ÷, ^, =.");
    const result = [];
    for (const token of tokens) {
      const last = result.at(-1);
      if ((numbers.test(last) || last === ")" || last === "x" || last === "y") &&
          (token === "(" || token === "x" || token === "y" || token === "√" || token === "sqrt" || (last === ")" && numbers.test(token)))) result.push("*");
      result.push(token);
    }
    return result;
  }

  function parse(tokens, steps, linear = false) {
    const describe = (value) => polyText(value, linear);
    const group = (value) => operand(value, linear);
    let i = 0;
    function expression(min = 1) {
      const token = tokens[i++];
      let value;
      if (token === "(") {
        value = expression();
        if (tokens[i++] !== ")") throw Error("Не хватает закрывающей скобки.");
      } else if (token === "-" || token === "+") {
        const child = expression(3);
        value = token === "-" ? child.map((coefficient) => coefficient.neg()) : child;
        if (token === "-" && child.length === 1) {
          steps.push("Меняем знак: −" + group(child) + " = " + describe(value));
        }
      } else if (token === "√" || token === "sqrt") {
        if (tokens[i++] !== "(") throw Error("Запишите корень со скобками, например √(49).");
        const radicand = expression();
        if (tokens[i++] !== ")") throw Error("Не хватает закрывающей скобки у корня.");
        if (radicand.length !== 1 || radicand[0].n < 0n) {
          throw Error("Этот режим извлекает квадратный корень из неотрицательного числа.");
        }
        const { n, d } = radicand[0];
        const a = sqrtFloor(n);
        const b = sqrtFloor(d);
        if (a * a !== n || b * b !== d) throw Error("Внутри выражения пока поддерживаются только точные рациональные корни.");
        value = [new Rational(a,b)];
        steps.push("√(" + describe(radicand) + ") = " + describe(value));
      } else if (token === "x") value = [zero, one];
      else if (token === "y" && linear) value = [zero, zero, one];
      else if (token && numbers.test(token)) {
        const [whole, decimal = ""] = token.split(".");
        value = [new Rational(BigInt(whole + decimal), 10n ** BigInt(decimal.length))];
      } else throw Error("Здесь ожидается число, x или выражение в скобках.");

      while (i < tokens.length && (precedence[tokens[i]] || 0) >= min) {
        const op = tokens[i++];
        const right = expression(precedence[op] + (op === "^" ? 0 : 1));
        const next = linear ? operateLinear(op, value, right) : operate(op, value, right);
        steps.push(group(value) + " " + symbols[op] + " " + group(right) + " = " + describe(next));
        value = next;
      }
      return value;
    }
    const value = expression();
    if (i !== tokens.length) throw Error("Проверьте скобки и знаки между числами.");
    return value;
  }

  function sqrtFloor(n) {
    if (n < 2n) return n;
    let current = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
    let next = (current + n / current) / 2n;
    while (next < current) {
      current = next;
      next = (current + n / current) / 2n;
    }
    return current;
  }

  function operateLinear(op, a, b) {
    if (op === "*" && a.length > 1 && b.length > 1) throw Error("Система должна быть линейной по x и y.");
    if (op === "^" && (b.length > 1 || (a.length > 1 && b[0].n > b[0].d))) {
      throw Error("Система должна быть линейной по x и y.");
    }
    if (op === "/" && b.length > 1) throw Error("Деление на выражение с x или y в линейной системе не поддерживается.");
    return operate(op, a, b);
  }

  function solveSystem(equations) {
    const steps = [];
    const rows = equations.map((equation, index) => {
      const tokens = tokenize(equation);
      const split = tokens.indexOf("=");
      if (split < 1 || split === tokens.length - 1 || tokens.lastIndexOf("=") !== split) {
        throw Error("В каждой строке системы должно быть одно равенство.");
      }
      const p = operateLinear("-", parse(tokens.slice(0, split), [], true), parse(tokens.slice(split + 1), [], true));
      const [c, x = zero, y = zero] = p;
      steps.push("Уравнение " + (index + 1) + " после переноса слагаемых: " + polyText(p, true) + " = 0.");
      return [x, y, c.neg()];
    });
    const [[a, b, c], [d, e, f]] = rows;
    if (rows.some(([x, y, constant]) => !x.n && !y.n && constant.n)) {
      steps.push("Одно из уравнений свелось к неверному числовому равенству.");
      return { answer: "Решений нет", steps };
    }
    const determinant = a.mul(e).sub(b.mul(d));
    const xDet = c.mul(e).sub(b.mul(f));
    const yDet = a.mul(f).sub(c.mul(d));
    steps.push("Определитель Δ = a₁b₂ − a₂b₁ = " + determinant.text() + ".");
    if (!determinant.n) {
      const inconsistent = xDet.n || yDet.n;
      steps.push(inconsistent ? "Левые части пропорциональны, а правые несовместимы." : "Оба уравнения задают не больше одного независимого условия.");
      return { answer: inconsistent ? "Решений нет" : "Бесконечно много решений", steps };
    }
    const x = xDet.div(determinant);
    const y = yDet.div(determinant);
    steps.push("Δx = c₁b₂ − c₂b₁ = " + xDet.text() + ". Делим на Δ: x = " + x.text() + ".");
    steps.push("Δy = a₁c₂ − a₂c₁ = " + yDet.text() + ". Делим на Δ: y = " + y.text() + ".");
    steps.push("Проверка подстановкой: " + a.mul(x).add(b.mul(y)).text() + " = " + c.text() + " и " + d.mul(x).add(e.mul(y)).text() + " = " + f.text() + ".");
    return { answer: "x = " + x.text() + ", y = " + y.text(), steps };
  }

  function solve(text) {
    const equations = String(text).trim().split(/[;\r\n]+/).map((line) => line.trim()).filter(Boolean);
    if (equations.length === 2) return solveSystem(equations);
    if (equations.length > 2) throw Error("Поддерживается система из двух линейных уравнений.");
    const tokens = tokenize(String(text));
    if (tokens.includes("y")) throw Error("Для системы с x и y введите два уравнения, каждое на отдельной строке.");
    const split = tokens.indexOf("=");
    const steps = [];
    if (split < 0) {
      if (tokens.includes("x")) throw Error("Для решения с x добавьте знак = и правую часть.");
      const value = parse(tokens, steps);
      const displayed = polyText(value);
      if (!steps.length || !steps.at(-1).endsWith(" = " + displayed)) steps.push("Получаем " + displayed + ".");
      return { answer: value[0].text(), steps };
    }
    const left = parse(tokens.slice(0, split), steps);
    const right = parse(tokens.slice(split + 1), steps);
    const p = operate("-", left, right);
    steps.push("Переносим всё в левую часть: " + polyText(p) + " = 0.");
    const [c, b = zero, a = zero] = p;
    if (p.length === 1) {
      if (!tokens.includes("x")) {
        return { answer: c.n === 0n ? "Равенство верно" : "Равенство неверно", steps };
      }
      const answer = c.n === 0n ? "Любое действительное x" : "Решений нет";
      steps.push(c.n === 0n ? "Равенство 0 = 0 верно при любом x." : "Получилось неверное равенство.");
      return { answer, steps };
    }
    if (p.length === 2) {
      const root = c.neg().div(b).text();
      steps.push("Выражаем x: " + operand([c.neg()]) + " ÷ " + operand([b]) + " = " + root + ".");
      return { answer: "x = " + root, steps };
    }
    const d = b.mul(b).sub(four.mul(a).mul(c));
    steps.push("D = b² − 4ac = " + operand([b]) + "² − 4 × " + operand([a]) + " × " + operand([c]) + " = " + d.text() + ".");
    if (d.n < 0n) {
      steps.push("D < 0, поэтому действительных корней нет.");
      return { answer: "Нет действительных корней", steps };
    }
    const denominator = two.mul(a);
    const minusB = b.neg();
    const rootN = sqrtFloor(d.n);
    const rootD = sqrtFloor(d.d);
    steps.push("Используем формулу x = (−b ± √D) / (2a).");
    if (rootN * rootN !== d.n || rootD * rootD !== d.d) {
      const answer = "(" + minusB.text() + " ± √(" + d.text() + ")) / (" + denominator.text() + ")";
      steps.push("Корни в точном виде: " + answer + ".");
      return { answer: "x = " + answer, steps };
    }
    const root = new Rational(rootN, rootD);
    const lower = minusB.sub(root).div(denominator);
    const upper = minusB.add(root).div(denominator);
    const roots = denominator.n > 0n ? [lower, upper] : [upper, lower];
    const answer = d.n === 0n ? "x = " + lower.text() : roots.map((value) => "x = " + value.text()).join(", ");
    steps.push("Подставляем D и упрощаем: " + answer + ".");
    return { answer, steps };
  }

  function solveRadicalSystem(uText, vText) {
    function parameter(text) {
      const value = text.trim().replace(",", ".").replace("−", "-");
      if (!/^[+-]?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(value) || value.length > 32) {
        throw Error("Введите u и v десятичными числами.");
      }
      const [whole, fraction = ""] = value.replace(/^[+-]/, "").split(".");
      const numerator = BigInt((whole || "0") + fraction);
      return new Rational(value.startsWith("-") ? -numerator : numerator, 10n ** BigInt(fraction.length));
    }

    const u = parameter(uText);
    const v = parameter(vText);
    const three = new Rational(3n);
    const q = three.mul(u.sub(v)).mul(u.add(v));
    const steps = [
      "Обозначим s = √(x² − y²). Для действительных корней и ненулевого знаменателя нужно 0 ≤ s < 1.",
      "Складываем и вычитаем уравнения. Получаем (1 − s)(x + y) = 3(u + v)D и (1 + s)(x − y) = (u − v)D, где D = √(1 − s²).",
      "Перемножаем равенства и сокращаем на D² = 1 − s². Получаем s² = 3(u² − v²) = " + q.text() + "."
    ];
    if (q.n < 0n || q.n >= q.d) {
      steps.push("Значение s² должно лежать в диапазоне [0, 1).");
      return { answer: "Нет действительных решений", steps };
    }
    const number = (value) => Number(value.n) / Number(value.d);
    const display = (value) => String(Number(value.toPrecision(10))).replace(".", ",").replace(/-/g, "−");
    const s = Math.sqrt(number(q));
    const d = Math.sqrt(number(one.sub(q)));
    const p = 3 * number(u.add(v)) * (1 + s) / d;
    const m = number(u.sub(v)) * d / (1 + s);
    const x = (p + m) / 2;
    const y = (p - m) / 2;
    steps.push("Подставляем s и D. Получаем x + y ≈ " + display(p) + " и x − y ≈ " + display(m) + ".");
    steps.push("Половина суммы этих выражений даёт x, половина разности — y.");
    return { answer: "x ≈ " + display(x) + ", y ≈ " + display(y), steps, x, y };
  }

  const api = { solve, solveRadicalSystem };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.PhotoMath = api;
})();
