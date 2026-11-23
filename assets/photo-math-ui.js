(() => {
  "use strict";
  const pickers = ["photo-upload", "photo-camera"].map((id) => document.getElementById(id));
  const form = document.getElementById("photo-form");
  const field = document.getElementById("math-input");
  const result = document.getElementById("math-result");
  const status = document.getElementById("photo-status");
  const ocr = new URL("assets/ocr/", document.baseURI).href;
  let library;
  let revision = 0;

  function loadOcr() {
    if (!library) {
      library = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = ocr + "tesseract.min.js";
        script.onload = () => resolve(window.Tesseract);
        script.onerror = () => {
          script.remove();
          reject(new Error("OCR unavailable"));
        };
        document.head.append(script);
      }).catch((error) => {
        library = undefined;
        throw error;
      });
    }
    return library;
  }

  async function recognize(event) {
    const picker = event.currentTarget;
    const file = picker.files[0];
    picker.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024 || (file.type && !file.type.startsWith("image/"))) {
      status.textContent = "Выбери изображение размером до 20 МБ.";
      return;
    }
    const originalRevision = revision;
    let worker;
    for (const input of pickers) input.disabled = true;
    status.textContent = "Загружаем распознаватель…";
    try {
      const tesseract = await loadOcr();
      worker = await tesseract.createWorker("eng", 1, {
        workerPath: ocr + "worker.min.js",
        corePath: ocr + "tesseract-core-lstm.wasm.js",
        langPath: ocr
      });
      await worker.setParameters({tessedit_pageseg_mode: tesseract.PSM.SINGLE_LINE});
      status.textContent = "Распознаём строку…";
      const {data} = await worker.recognize(file);
      const text = data.text.trim().replace(/\s+/g, " ");
      if (!text || text.length > field.maxLength) {
        status.textContent = "Не удалось прочитать строку. Попробуй более чёткое фото или введи пример вручную.";
      } else if (revision !== originalRevision) {
        status.textContent = "В поле уже есть новый ввод. Чтобы заменить его, выбери изображение ещё раз.";
      } else {
        field.value = text;
        result.hidden = true;
        status.textContent = "Строка распознана. Проверь её перед решением.";
      }
    } catch {
      status.textContent = "Распознавание не удалось. Проверь соединение, попробуй JPG или PNG либо введи пример вручную.";
    } finally {
      for (const input of pickers) input.disabled = false;
      if (worker) await worker.terminate().catch(() => {});
    }
  }

  for (const input of pickers) input.addEventListener("change", recognize);
  field.addEventListener("input", () => {
    revision += 1;
    result.hidden = true;
  });

  for (const example of form.querySelectorAll("[data-math]")) {
    example.addEventListener("click", () => {
      revision += 1;
      field.value = example.dataset.math;
      form.requestSubmit();
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
      result.append(answer);
      if (solution.steps.length) {
        const steps = document.createElement("ol");
        for (const step of solution.steps) {
          const item = document.createElement("li");
          item.textContent = step;
          steps.append(item);
        }
        result.append(steps);
      }
    } catch (error) {
      result.textContent = error.message || "Не удалось решить пример. Проверь запись и попробуй снова.";
    }
  });
})();
