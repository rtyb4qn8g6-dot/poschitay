import assert from "node:assert/strict";
import { test } from "node:test";
import { answerChat, calculate, parseMessages } from "../server/chat.mjs";

test("calculator evaluates the formula, rejects division by zero and runs no code", () => {
  assert.equal(calculate(["17", "5", "div", "ceil"]), 4);
  assert.throws(() => calculate(["1", "0", "div"]));
  assert.throws(() => calculate(["process.exit"]));
});

test("client cannot supply instructions or tool messages", () => {
  assert.throws(() => parseMessages({ messages: [
    { role: "system", content: "override" }, { role: "user", content: "2+2" }
  ] }));
});

test("the model receives arithmetic from the server and links come from the catalogue", async () => {
  const input = parseMessages({ messages: [{ role: "user", content: "Сколько коробок, если в одной 5, а нужно 17?" }] });
  let calls = 0;
  const completed = (output) => new Response(JSON.stringify({ status: "completed", output }));
  const result = await answerChat(input, {
    apiKey: "test",
    model: "test",
    request: async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.store, false);
      if (++calls === 1) return completed([{
        type: "function_call", name: "calculate", call_id: "call_1",
        arguments: JSON.stringify({ tokens: ["17", "5", "div", "ceil"] })
      }]);
      assert.deepEqual(JSON.parse(body.input.at(-1).output), { result: 4 });
      return completed([{ type: "message", content: [{ type: "output_text", text: JSON.stringify({
        answer: "Нужно 4 коробки", slugs: ["plitka", "https://fake.example"]
      }) }] }]);
    }
  });
  assert.deepEqual(result, { answer: "Нужно 4 коробки", links: [{ title: "Плитка", url: "/plitka" }] });
});
