(() => {
  const formatters = {
    currency: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
    integer: new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }),
    percent: new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    decimal: new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }),
  };

  const formatValue = (value, type) => {
    const formatted = (formatters[type] || formatters.decimal).format(value);
    return type === "percent" ? `${formatted}%` : formatted;
  };

  const tooltipRows = (entry, format, activeSeries) => {
    const visible = (entry.values || []).filter((item) => item.seriesIndex === undefined || activeSeries.has(item.seriesIndex));
    return visible
    .filter((item, index) => !(item.className || "").includes("provisional") || !visible.some((other, otherIndex) => otherIndex !== index && other.value === item.value && !(other.className || "").includes("provisional")))
    .map((item) => `<span><i class="${item.className || ""}"></i>${item.label}<b>${formatValue(item.value, format)}</b></span>`)
    .join("");
  };

  const initChart = (root) => {
    if (root.dataset.ready === "true") return;
    root.dataset.ready = "true";

    let source;
    try { source = JSON.parse(root.dataset.chart || "{}"); } catch { return; }
    const kind = root.dataset.chartKind;
    const svg = root.querySelector("svg");
    const tooltip = root.querySelector(".chart-tooltip");
    const inspectors = [...root.querySelectorAll(".chart-inspector")];
    const activeSeries = new Set((source.series || []).map((item) => item.index));
    let pinned = false;
    let currentIndex = 0;

    const entryAt = (index) => kind === "forecast" ? source.entries[index] : {
      periodo: source.labels[index],
      values: source.series
        .filter((item) => Number.isFinite(item.values[index]))
        .map((item) => ({ label: item.label, value: item.values[index], className: item.className, seriesIndex: item.index })),
    };

    const hide = () => {
      if (pinned) return;
      inspectors.forEach((item) => item.classList.remove("active"));
      tooltip.hidden = true;
    };

    const show = (index, shouldFocus = false) => {
      const inspector = inspectors[index];
      const entry = entryAt(index);
      if (!inspector || !entry) return;
      currentIndex = index;
      inspectors.forEach((item, itemIndex) => {
        item.classList.toggle("active", itemIndex === index);
        item.tabIndex = itemIndex === index ? 0 : -1;
      });
      if (shouldFocus) inspector.focus({ preventScroll: true });
      tooltip.innerHTML = `<strong>${entry.periodo}</strong>${tooltipRows(entry, source.valueFormat, activeSeries)}`;
      tooltip.hidden = false;
      const viewBox = svg.viewBox.baseVal;
      const chartX = Number(inspector.dataset.chartX || 0);
      const pixelX = ((chartX - viewBox.x) / viewBox.width) * root.clientWidth;
      tooltip.style.left = `${Math.min(Math.max(pixelX, 94), Math.max(94, root.clientWidth - 94))}px`;
    };

    inspectors.forEach((inspector, index) => {
      inspector.addEventListener("pointerenter", () => show(index));
      inspector.addEventListener("focus", () => show(index));
      inspector.addEventListener("click", () => {
        pinned = !(pinned && currentIndex === index);
        show(index);
        root.classList.toggle("chart-pinned", pinned);
      });
      inspector.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End", "Escape", "Enter", " "].includes(event.key)) return;
        event.preventDefault();
        if (event.key === "Escape") {
          pinned = false;
          root.classList.remove("chart-pinned");
          hide();
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          pinned = !pinned;
          root.classList.toggle("chart-pinned", pinned);
          show(index);
          return;
        }
        const next = event.key === "Home" ? 0 : event.key === "End" ? inspectors.length - 1 : Math.min(inspectors.length - 1, Math.max(0, index + (event.key === "ArrowRight" ? 1 : -1)));
        show(next, true);
      });
    });

    root.addEventListener("pointerleave", hide);
    root.addEventListener("focusout", (event) => {
      if (!root.contains(event.relatedTarget)) hide();
    });

    root.querySelectorAll("[data-series-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const seriesIndex = Number(button.dataset.seriesToggle);
        const isVisible = activeSeries.has(seriesIndex);
        if (isVisible && activeSeries.size === 1) return;
        if (isVisible) activeSeries.delete(seriesIndex); else activeSeries.add(seriesIndex);
        button.setAttribute("aria-pressed", String(!isVisible));
        root.querySelectorAll(`[data-series-index="${seriesIndex}"]`).forEach((item) => item.classList.toggle("series-hidden", isVisible));
        if (!tooltip.hidden) show(currentIndex);
      });
    });
  };

  const init = () => document.querySelectorAll(".interactive-chart").forEach(initChart);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  document.addEventListener("astro:page-load", init);
})();
