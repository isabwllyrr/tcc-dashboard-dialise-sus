(() => {
  const form = document.querySelector("#agent-form");
  const output = document.querySelector("#agent-answer");
  if (!form || !output) return;

  const textarea = form.querySelector("textarea");
  const button = form.querySelector("button[type='submit']");
  const buttonLabel = button.querySelector("span");
  const answerText = output.querySelector("#agent-answer-text");
  const answerSource = output.querySelector("#agent-source");
  const warning = output.querySelector("#agent-warning");
  const route = output.querySelector("#agent-route");
  const defaultButtonLabel = buttonLabel.textContent;

  function setLoading(loading) {
    form.setAttribute("aria-busy", String(loading));
    button.disabled = loading;
    buttonLabel.textContent = loading ? "Analisando" : defaultButtonLabel;
    output.classList.toggle("is-loading", loading);
  }

  function showPending() {
    output.hidden = false;
    answerSource.textContent = "Dossiê DialisaSUS";
    answerText.textContent = "Consultando as evidências...";
    warning.hidden = true;
    route.hidden = true;
  }

  function showAnswer(data) {
    const labels = {
      gemini: "Gemini + dossiê",
      local_fallback: "Dossiê local",
      safety_rule: "Regra de segurança",
    };
    answerSource.textContent = labels[data.source] || "Dossiê DialisaSUS";
    answerText.textContent = data.answer || "Não foi possível gerar uma resposta.";
    warning.textContent = data.warning || "";
    warning.hidden = !data.warning;
    route.href = data.route || "/sobre-a-base/";
    route.hidden = false;
    output.focus({ preventScroll: true });
    output.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function showError(message) {
    answerSource.textContent = "Consulta indisponível";
    answerText.textContent = message || "Não foi possível consultar o assistente agora.";
    warning.hidden = true;
    route.href = "/sobre-a-base/";
    route.hidden = false;
    output.focus({ preventScroll: true });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = textarea.value.trim();
    if (!question) {
      textarea.focus();
      return;
    }

    showPending();
    setLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await response.json() : {};
      if (!response.ok) throw new Error(data.detail || "A consulta não pôde ser concluída.");
      showAnswer(data);
    } catch (error) {
      const message = error.name === "AbortError"
        ? "A consulta demorou mais que o esperado. Tente novamente."
        : error.message;
      showError(message);
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  });

  document.querySelectorAll("[data-question]").forEach((chip) => {
    chip.addEventListener("click", () => {
      textarea.value = chip.dataset.question || "";
      textarea.focus();
      form.requestSubmit();
    });
  });
})();
