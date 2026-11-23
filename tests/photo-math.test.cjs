"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { solve, solveRadicalSystem } = require("../assets/photo-math.js");

const expressions = [
  ["2+3*4", "14"],
  ["(2+3)*4", "20"],
  ["-2^2", "-4"],
  ["1/2+1/3", "5/6"],
];

for (const [expression, expected] of expressions) {
  test(`correctly evaluates ${expression}`, () => {
    const { answer, steps } = solve(expression);
    assert.equal(answer.trim(), expected);
    assert.ok(Array.isArray(steps) && steps.length > 0);
    assert.ok(steps.every((step) => typeof step === "string" && step.trim()));
  });
}

test("finds the solution of a linear equation", () => {
  assert.match(solve("2x+5=17").answer, /^\s*x\s*=\s*6\s*$/);
});

test("finds each distinct root of a quadratic equation", () => {
  const { answer } = solve("x^2-5x+6=0");
  const roots = Array.from(answer.matchAll(/x(?:[_₁₂12]+)?\s*=\s*([+-]?\d+)/g), ([, root]) => Number(root));
  assert.deepEqual(roots.sort((a, b) => a - b), [2, 3]);
});

test("rejects division by zero", () => {
  assert.throws(() => solve("1/(3-3)"), Error);
});

test("rejects unrecognized tokens", () => {
  assert.throws(() => solve("2+@3"), Error);
});

test("solves two linear equations using exact fractions", () => {
  assert.equal(solve("x+y=7\n2x-y=2").answer, "x = 3, y = 4");
  assert.equal(solve("2x+y=4;2x-y=1").answer, "x = 5/4, y = 3/2");
  assert.equal(solve("x+y=1\n2x+2y=2").answer, "Бесконечно много решений");
  assert.equal(solve("x+y=1\n2x+2y=3").answer, "Решений нет");
  assert.equal(solve("x+y=1\n0=2").answer, "Решений нет");
  assert.throws(() => solve("x*y=1\nx+y=2"), /линейной/);
});

test("evaluates exact square roots in expressions", () => {
  assert.equal(solve("√(81) + sqrt(1/4)").answer, "19/2");
  assert.equal(solve("2√(9)").answer, "6");
  assert.throws(() => solve("√(-1)"), /неотрицательного/);
  assert.throws(() => solve("√(2)+1"), /рациональные/);
});

test("solves the radical system and satisfies both original equations", () => {
  const u = 0.4;
  const v = -0.2;
  const { x, y } = solveRadicalSystem("0,4", "−0,2");
  const s = Math.sqrt(x * x - y * y);
  const d = Math.sqrt(1 - x * x + y * y);
  assert.ok(Math.abs((x * (2 + s) - y * (1 + 2 * s)) / d - 3 * u) < 1e-12);
  assert.ok(Math.abs((y * (2 + s) - x * (1 + 2 * s)) / d - 3 * v) < 1e-12);
});

test("handles the radical system domain and validates parameters", () => {
  const { x, y } = solveRadicalSystem("0.5", "0.5");
  assert.equal(x, 1.5);
  assert.equal(y, 1.5);
  assert.equal(solveRadicalSystem("0", "1").answer, "Нет действительных решений");
  assert.equal(solveRadicalSystem("1", "0").answer, "Нет действительных решений");
  assert.throws(() => solveRadicalSystem("", "1"), /десятичными/);
});
