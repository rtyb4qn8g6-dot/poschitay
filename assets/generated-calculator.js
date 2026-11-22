"use strict";

const binary = {
  "+": (a, b) => a + b, "-": (a, b) => a - b,
  "*": (a, b) => a * b, "/": (a, b) => a / b,
  min: Math.min, max: Math.max
};
function roundUp(value) {
  const nearest = Math.round(value);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(value)) * 4;
  if (nearest > 0 && Math.abs(value - nearest) <= tolerance) return nearest;
  return Math.ceil(value);
}
const unary = { ceil: roundUp, floor: Math.floor };

function evaluateFormula(tokens, values) {
  const stack = [];
  for (const token of tokens) {
    if (Object.hasOwn(values, token)) stack.push(values[token]);
    else if (/^-?\d+(?:\.\d+)?$/.test(token)) stack.push(Number(token));
    else if (Object.hasOwn(binary, token) && stack.length >= 2) {
      const right = stack.pop();
      stack.push(binary[token](stack.pop(), right));
    } else if (Object.hasOwn(unary, token) && stack.length) stack.push(unary[token](stack.pop()));
    else throw Error("Некорректная формула");
    if (!Number.isFinite(stack.at(-1)) || Math.abs(stack.at(-1)) > 1e12) {
      throw Error("Проверьте значения. Результат вне диапазона.");
    }
  }
  if (stack.length !== 1) throw Error("Некорректная формула");
  return stack[0];
}

if (typeof module !== "undefined" && module.exports) module.exports = evaluateFormula;
else {
  const spec = JSON.parse(document.getElementById("calculator-spec").textContent);
  runEstimate((values) => result(fmt(evaluateFormula(spec.expression, values), 3) + " " + spec.unit, []));
}
