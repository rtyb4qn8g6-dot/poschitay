(() => {
  "use strict";

  const el = (id) => document.getElementById(id);
  const buttons = [...document.querySelectorAll("[data-photo-picker]")];
  const form = el("photo-form");
  const field = el("math-input");
  const result = el("math-result");
  const status = el("photo-status");
  const preview = el("photo-preview");
  const previewImage = el("photo-image");
  const choices = el("photo-lines");
  const vendor = new URL("assets/ocr/", document.baseURI).href;
  const scripts = new Map();
  let previewUrl;
  let revision = 0;

  function loadScript(filename, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (scripts.has(filename)) return scripts.get(filename);
    const script = document.createElement("script");
    script.src = vendor + filename;
    const pending = new Promise((resolve, reject) => {
      const finish = (error) => {
        clearTimeout(timer);
        script.remove();
        if (error) reject(error);
        else resolve(window[globalName]);
      };
      const failure = () => finish(Error("Не удалось загрузить модуль распознавания. Проверь соединение и выбери фото ещё раз."));
      const timer = setTimeout(failure, 12000);
      script.onload = () => window[globalName] ? finish() : failure();
      script.onerror = failure;
      document.head.append(script);
    }).finally(() => scripts.delete(filename));
    scripts.set(filename, pending);
    return pending;
  }

  function imageFrom(url) {
    const image = new Image();
    image.src = url;
    return image.decode().then(() => image);
  }

  function setPreview(blob) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    return previewUrl;
  }

  async function prepareImage(file, expired) {
    let url = setPreview(file);
    let image;
    try {
      image = await imageFrom(url);
    } catch {
      if (expired()) return null;
      if (!/\.hei[cf]$/i.test(file.name) && !/^image\/hei[cf]/i.test(file.type)) {
        throw Error("Браузер не открыл это фото. Выбери JPG, PNG, WebP или HEIC.");
      }
      status.textContent = "Подготавливаем фото HEIC…";
      const convert = await loadScript("heic2any.min.js", "heic2any");
      let converted;
      try {
        converted = await convert({ blob: file, toType: "image/jpeg", quality: 0.93 });
        if (expired()) return null;
        url = setPreview(Array.isArray(converted) ? converted[0] : converted);
        image = await imageFrom(url);
      } catch {
        throw Error("Этот HEIC не удалось открыть. Попробуй снимок экрана или сохрани фото как JPG.");
      }
    }
    if (expired()) return null;
    previewImage.src = url;
    previewImage.hidden = false;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Браузер не смог подготовить изображение.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function showSolution(text) {
    field.value = text;
    form.requestSubmit();
  }

  function extractedLines(text) {
    return [...new Set(text.split(/\r?\n/).map((line) => line.trim().replace(/[ \t]+/g, " "))
      .filter((line) => line && line.length <= field.maxLength))];
  }

  function canSolve(text) {
    if (!/[+*/=^×÷−-]/.test(text) || !/\d/.test(text)) return false;
    try {
      window.PhotoMath.solve(text);
      return true;
    } catch {
      return false;
    }
  }

  function present(lines, originalRevision) {
    if (revision !== originalRevision) {
      status.textContent = "Твой ввод сохранён. Выбери фото ещё раз, чтобы подставить распознанный текст.";
      return;
    }
    const paired = lines.length === 2 && lines.every((line) => line.includes("=")) &&
      lines.some((line) => /[yу]/i.test(line));
    if (paired) {
      const system = lines.join("\n");
      try {
        window.PhotoMath.solve(system);
        showSolution(system);
        status.textContent = "Распознана линейная система. Сверь обе строки с фото.";
      } catch {
        field.value = system;
        status.textContent = "Две строки распознаны, но система не решилась. Проверь запись. Для примера с корнями смотри разбор ниже.";
      }
      return;
    }
    const solvable = lines.filter(canSolve);
    if (solvable.length === 1) {
      showSolution(solvable[0]);
      status.textContent = "Решение готово. Сверь распознанную запись с фото. Если знак или цифра отличаются, поправь и пересчитай.";
    } else if (solvable.length > 1) {
      for (const [index, line] of solvable.entries()) {
        const choice = document.createElement("button");
        choice.type = "button";
        choice.className = "chip";
        choice.textContent = line;
        choice.setAttribute("aria-label", "Пример " + (index + 1) + ": " + line);
        choice.addEventListener("click", () => { revision += 1; showSolution(line); });
        choices.append(choice);
      }
      choices.hidden = false;
      status.textContent = "Нашли несколько примеров. Выбери, какой решить.";
    } else if (lines.length === 1) {
      field.value = lines[0];
      status.textContent = "Фото прочитано частично. Поправь запись в поле ниже и нажми «Решить по шагам».";
    } else {
      status.textContent = "Не удалось прочитать математическую запись. Для дробей с чертой и сложных корней попробуй ручной ввод или разбор ниже.";
    }
  }

  async function recognize(event) {
    const picker = event.currentTarget;
    const file = picker.files[0];
    if (!file) return;
    picker.value = "";
    choices.replaceChildren();
    choices.hidden = true;
    result.hidden = true;
    preview.hidden = false;
    previewImage.hidden = true;
    previewImage.removeAttribute("src");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = undefined;
    el("photo-filename").textContent = file.name;
    if (file.size > 20 * 1024 * 1024 || (!/^image\//i.test(file.type) && !/\.(jpe?g|png|webp|hei[cf])$/i.test(file.name))) {
      status.textContent = "Выбери фото JPG, PNG, WebP или HEIC размером до 20 МБ.";
      return;
    }
    const originalRevision = revision;
    let worker;
    let done = false;
    let timer;
    for (const button of buttons) button.disabled = true;
    status.textContent = "Фото выбрано. Подготавливаем изображение…";
    const operation = async (fail) => {
      const canvas = await prepareImage(file, () => done);
      if (done) return [];
      status.textContent = "Запускаем распознавание…";
      const tesseract = await loadScript("tesseract.min.js", "Tesseract");
      if (done) return [];
      worker = await tesseract.createWorker("eng", 1, {
        workerPath: vendor + "worker.min.js",
        corePath: vendor + "tesseract-core-lstm.wasm.js",
        langPath: vendor,
        errorHandler: () => fail(Error("Распознаватель не запустился. Выбери фото ещё раз или введи пример вручную."))
      });
      if (done) {
        await worker.terminate();
        return [];
      }
      status.textContent = "Распознаём текст на фото…";
      const recognizeWith = async (mode) => {
        await worker.setParameters({ tessedit_pageseg_mode: mode });
        const { data } = await worker.recognize(canvas);
        return extractedLines(data.text);
      };
      const wide = canvas.width > canvas.height * 2.4;
      const lines = await recognizeWith(wide ? tesseract.PSM.SINGLE_LINE : tesseract.PSM.SPARSE_TEXT);
      if (done || lines.some(canSolve) || lines.filter((line) => line.includes("=")).length >= 2) return lines;
      const alternate = await recognizeWith(wide ? tesseract.PSM.SPARSE_TEXT : tesseract.PSM.SINGLE_LINE);
      return alternate.some(canSolve) || !lines.length ? alternate : lines;
    };
    try {
      let fail;
      const failure = new Promise((_, reject) => {
        fail = reject;
        timer = setTimeout(() => reject(Error("Распознавание заняло слишком много времени. Попробуй обрезать фото до одной строки.")), 45000);
      });
      present(await Promise.race([operation(fail), failure]), originalRevision);
    } catch (error) {
      status.textContent = error.message || "Не удалось распознать фото. Попробуй другое изображение.";
    } finally {
      done = true;
      clearTimeout(timer);
      for (const button of buttons) button.disabled = false;
      if (worker) await worker.terminate().catch(() => {});
    }
  }

  for (const button of buttons) {
    const input = el(button.dataset.photoPicker);
    button.addEventListener("click", () => input.click());
    input.addEventListener("change", recognize);
  }

  field.addEventListener("input", () => {
    revision += 1;
    result.hidden = true;
  });
  for (const example of form.querySelectorAll("[data-math]")) {
    example.addEventListener("click", () => {
      revision += 1;
      showSolution(example.dataset.math);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    result.replaceChildren();
    result.hidden = false;
    try {
      const solution = window.PhotoMath.solve(field.value);
      const answer = document.createElement("div");
      answer.className = "big";
      answer.textContent = solution.answer;
      const steps = document.createElement("ol");
      for (const step of solution.steps) {
        const item = document.createElement("li");
        item.textContent = step;
        steps.append(item);
      }
      result.append(answer, steps);
    } catch (error) {
      result.textContent = error.message || "Не удалось решить пример. Проверь запись и попробуй снова.";
    }
  });
})();
