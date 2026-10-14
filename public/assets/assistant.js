(() => {
  const form = document.querySelector("#agent-form");
  const thread = document.querySelector("#assistant-thread");
  if (!form || !thread) return;

  const textarea = form.querySelector("textarea");
  const button = form.querySelector("button[type='submit']");
  const buttonLabel = button.querySelector("span");
  const defaultButtonLabel = buttonLabel.textContent;
  const count = document.querySelector("#conversation-count");
  const followups = document.querySelector("#assistant-followups");
  let consultations = 0;

  const followupByCategory = {
    valor: ["Qual a diferença entre valor nominal e valor corrigido?", "O custo cresceu mais que a produção?"],
    contagem: ["A produção aumentou após a pandemia?", "Esses procedimentos representam pacientes?"],
    territorio: ["Por que não posso interpretar o mapa como prevalência?", "Qual indicador permite comparar UFs de tamanhos diferentes?"],
    modelo: ["Por que a projeção usa Gradient Boosting?", "O que o MAPE informa sobre a previsão?"],
    base: ["Quais são as limitações da base?", "Quais meses de 2026 são provisórios?"],
  };

  function setLoading(loading) {
    form.setAttribute("aria-busy", String(loading));
    button.disabled = loading;
    buttonLabel.textContent = loading ? "Analisando" : defaultButtonLabel;
    form.classList.toggle("is-loading", loading);
  }

  function message(role, text, meta = {}) {
    const article = document.createElement("article");
    article.className = `thread-message ${role === "user" ? "user-message" : "assistant-message"}`;
    const label = document.createElement("span");
    label.textContent = role === "user" ? "Você" : (meta.source || "DialisaSUS");
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    article.append(label, paragraph);
    if (meta.warning) {
      const warning = document.createElement("small");
      warning.className = "thread-warning";
      warning.textContent = meta.warning;
      article.append(warning);
    }
    if (meta.route) {
      const link = document.createElement("a");
      link.href = meta.route;
      link.textContent = "Conferir evidência ↗";
      article.append(link);
    }
    thread.append(article);
    article.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return article;
  }

  function showAnswer(data) {
    const labels = {
      gemini: "Gemini + dossiê",
      local_fallback: "Dossiê local",
      safety_rule: "Regra de segurança",
    };
    message("assistant", data.answer || "Não foi possível gerar uma resposta.", { source: labels[data.source] || "Dossiê DialisaSUS", warning: data.warning, route: data.route || "/sobre-a-base/" });
    consultations += 1;
    count.textContent = `${consultations} ${consultations === 1 ? "consulta" : "consultas"}`;
    renderFollowups(data.category);
  }

  function showError(message) {
    message("assistant", message || "Não foi possível consultar o assistente agora.", { source: "Consulta indisponível", route: "/sobre-a-base/" });
  }

  function renderFollowups(category) {
    const options = followupByCategory[category] || followupByCategory.base;
    followups.replaceChildren();
    const label = document.createElement("span"); label.textContent = "Continue explorando"; followups.append(label);
    options.forEach((question) => {
      const item = document.createElement("button"); item.type = "button"; item.textContent = question;
      item.addEventListener("click", () => { textarea.value = question; form.requestSubmit(); });
      followups.append(item);
    });
    followups.hidden = false;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = textarea.value.trim();
    if (!question) {
      textarea.focus();
      return;
    }

    message("user", question);
    textarea.value = "";
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

  document.querySelector("#clear-conversation")?.addEventListener("click", () => {
    thread.innerHTML = '<article class="thread-message assistant-message"><span>DialisaSUS</span><p>Conversa limpa. Faça uma nova pergunta sobre as evidências do painel.</p></article>';
    consultations = 0; count.textContent = "0 consultas"; followups.hidden = true; textarea.focus();
  });
})();
