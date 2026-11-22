import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../assets/app.js", import.meta.url), "utf8");
const entries = source.split("const CALCS = [")[1].split("\n];")[0];
const catalogue = new Map(
  Array.from(entries.matchAll(/^\s*\["[^"]*", "([^"]+)", "([a-z0-9-]+)", "([^"]*)"/gm),
    ([, title, slug, keywords]) => [slug, { title, url: "/" + slug, keywords }])
);
const operations = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
  pow: (a, b) => a ** b,
  min: Math.min,
  max: Math.max
};
const unary = { sqrt: Math.sqrt, ceil: Math.ceil, floor: Math.floor, round: Math.round, abs: Math.abs };

export function calculate(tokens) {
  if (!Array.isArray(tokens) || tokens.length < 1 || tokens.length > 80) throw Error("Недопустимая формула");
  const stack = [];
  for (const token of tokens) {
    if (typeof token !== "string") throw Error("Недопустимый токен");
    if (/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(token)) stack.push(Number(token));
    else if (Object.hasOwn(unary, token) && stack.length >= 1) stack.push(unary[token](stack.pop()));
    else if (Object.hasOwn(operations, token) && stack.length >= 2) {
      const second = stack.pop();
      stack.push(operations[token](stack.pop(), second));
    } else throw Error("Неизвестная операция или недостаточно чисел");
    if (!Number.isFinite(stack.at(-1)) || Math.abs(stack.at(-1)) > 1e15) throw Error("Результат вне диапазона");
  }
  if (stack.length !== 1) throw Error("Формула должна давать одно число");
  return stack[0];
}

const tools = [{
  type: "function",
  name: "calculate",
  description: "Evaluate arithmetic in reverse Polish notation. Use separate tokens, decimals with a dot. For (12+4)*1.1 use [\"12\",\"4\",\"add\",\"1.1\",\"mul\"]. Operators add sub mul div pow min max sqrt ceil floor round abs.",
  strict: true,
  parameters: {
    type: "object",
    properties: { tokens: { type: "array", items: { type: "string" } } },
    required: ["tokens"],
    additionalProperties: false
  }
}];

const instructions = `Ты помощник сайта «Посчитай». Отвечай по-русски, кратко и простым текстом. Помогай с бытовыми вычислениями. Если данных не хватает, задай один конкретный уточняющий вопрос. Если расчёт возможен, посчитай здесь даже при отсутствии готовой страницы. Для всех вычисляемых чисел используй calculate и опирайся только на успешный ответ инструмента. Покажи короткую формулу, единицы и допущения. Не угадывай текущие цены, ставки, нормы и другие изменяемые данные. Не рассчитывай медицинские дозировки и опасные смеси. Рекомендуй максимум два уместных инструмента строго из каталога. Ответ дай как объект с answer (текст) и slugs (массив из нуля, одного или двух идентификаторов).
Каталог:
${[...catalogue].map(([slug, item]) => `${slug}: ${item.title} (${item.keywords})`).join("\n")}`;

export function parseMessages(body) {
  const { messages } = body ?? {};
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 12 || messages.at(-1)?.role !== "user") throw Error("Неверный формат диалога");
  return messages.map((item) => {
    if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string" ||
        !item.content.trim() || item.content.length > 2500) throw Error("Неверный формат сообщения");
    return { role: item.role, content: item.content.trim() };
  });
}

export async function answerChat(messages, { apiKey, model, request = fetch }) {
  const input = [...messages];
  const signal = AbortSignal.timeout(24000);
  for (let round = 0; round < 4; round++) {
    const response = await request("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        model, instructions, input, store: false, tools, parallel_tool_calls: false, max_output_tokens: 850,
        text: { format: {
          type: "json_schema", name: "calculator_answer", strict: true,
          schema: { type: "object", properties: {
            answer: { type: "string" }, slugs: { type: "array", items: { type: "string" } }
          }, required: ["answer", "slugs"], additionalProperties: false }
        } }
      })
    });
    if (!response.ok) throw Error("Ошибка поставщика ИИ");
    const data = await response.json();
    if (data.status !== "completed" || !Array.isArray(data.output)) throw Error("Неполный ответ ИИ");
    const calls = data.output.filter((item) => item.type === "function_call");
    if (calls.length) {
      if (calls.length > 1) throw Error("Получено слишком много вызовов");
      input.push(...data.output);
      for (const call of calls) {
        let output;
        try {
          if (call.name !== "calculate") throw Error("Неизвестный инструмент");
          output = { result: calculate(JSON.parse(call.arguments).tokens) };
        } catch (error) {
          output = { error: error.message };
        }
        input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(output) });
      }
      continue;
    }
    const message = data.output.find((item) => item.type === "message");
    const content = message?.content?.find((part) => part.type === "output_text");
    if (!content) return { answer: "Не могу помочь с этим расчётом. Попробуйте описать другую задачу.", links: [] };
    const { answer, slugs } = JSON.parse(content.text);
    if (typeof answer !== "string" || !answer.trim() || !Array.isArray(slugs)) throw Error("Некорректный ответ ИИ");
    const links = [...new Set(slugs)].filter((slug) => catalogue.has(slug)).slice(0, 2)
      .map((slug) => ({ title: catalogue.get(slug).title, url: catalogue.get(slug).url }));
    return { answer, links };
  }
  throw Error("Превышено число шагов расчёта");
}
