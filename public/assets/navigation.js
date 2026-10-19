(() => {
  const toggle = document.querySelector("#nav-toggle");
  const nav = document.querySelector("#primary-nav");
  if (!toggle || !nav) return;

  const close = () => {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu de navegação");
    nav.removeAttribute("data-open");
  };

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    if (open) close();
    else {
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Fechar menu de navegação");
      nav.setAttribute("data-open", "");
    }
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });

  matchMedia("(min-width: 621px)").addEventListener("change", (event) => {
    if (event.matches) close();
  });
})();
