"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { solve } = require("../assets/photo-math.js");

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
