"use strict";

const form = document.getElementById("chat-form");
const field = document.getElementById("chat-input");
const status = document.getElementById("chat-status");
const send = document.getElementById("chat-send");
const log = document.getElementById("chat-log");
const endpoint = document.querySelector('meta[name="ai-chat-endpoint"]').content;
const messages = [];

function addMessage(role, text, links = []) {
  const item = document.createElement("article");
  item.className = "chat-message";
  item.dataset.role = role;
  const label = document.createElement("strong");
  label.textContent = role === "user" ? "Вы" : "Посчитай";
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  item.append(label, paragraph);
  const list = document.createElement("ul");
  for (const link of links) {
    if (!link || typeof link.title !== "string" || typeof link.url !== "string" ||
        !/^\/[a-z0-9-]+$/.test(link.url)) continue;
    const row = document.createElement("li");
    const anchor = document.createElement("a");
    anchor.href = link.url;
    anchor.textContent = link.title;
    row.append(anchor);
    list.append(row);
  }
  if (list.childElementCount) item.append(list);
  log.append(item);
  log.scrollTop = log.scrollHeight;
  return item;
}

for (const example of document.querySelectorAll("[data-example]")) {
  example.addEventListener("click", () => {
    field.value = example.dataset.example;
    field.focus();
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = field.value.trim();
  if (!question || send.disabled) return;
  const pending = { role: "user", content: question };
  const row = addMessage("user", question);
  field.value = "";
  send.disabled = true;
  status.textContent = "Считаю…";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages.slice(-10), pending] }),
      signal: AbortSignal.timeout(30000)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || typeof data?.answer !== "string" || !data.answer.trim()) {
      throw new Error(data?.error || "ИИ-чат пока недоступен. Попробуйте позже.");
    }
    addMessage("assistant", data.answer, Array.isArray(data.links) ? data.links : []);
    messages.push(pending, { role: "assistant", content: data.answer.slice(0, 2500) });
    if (messages.length > 10) messages.splice(0, messages.length - 10);
    status.textContent = "";
  } catch (error) {
    row.remove();
    if (!field.value) field.value = question;
    status.textContent = error.name === "TimeoutError"
      ? "Ответ занял слишком много времени. Попробуйте ещё раз."
      : error instanceof TypeError ? "Не удалось соединиться с ИИ-чатом." : error.message;
  } finally {
    send.disabled = false;
    if (document.activeElement === document.body || document.activeElement === send) field.focus();
  }
});
