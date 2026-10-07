(() => {
  const dataNode = document.querySelector("#dashboard-data");
  if (!dataNode) return;
  const data = JSON.parse(dataNode.textContent || "{}");
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const svgNS = "http://www.w3.org/2000/svg";
  const ufNames = Object.fromEntries(data.ufs.map((uf) => [uf.sigla, uf.nome]));
  const municipalitiesByCode = Object.fromEntries(data.municipalities.map((item) => [item.code, item]));

  const controls = {
    year: $("#dashboard-year"), uf: $("#dashboard-uf"), municipality: $("#dashboard-municipality"),
    metric: $("#dashboard-metric"), compareA: $("#compare-a"), compareB: $("#compare-b"),
    search: $("#table-search"), sort: $("#table-sort"),
  };
  const state = { year: controls.year.value, uf: "BR", municipality: "", metric: controls.metric.value, view: "executive", tableRows: [] };
  const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const compactMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 2 });
  const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 2 });
  const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

  const metrics = {
    taxa_qtd_100k: { label: "procedimentos/100 mil", short: "Taxa/100 mil", format: (v) => number.format(v), note: "Produção aprovada por 100 mil habitantes; não representa prevalência." },
    qtd_aprovada: { label: "procedimentos aprovados", short: "Quantidade", format: (v) => compact.format(v), note: "Totais absolutos refletem porte populacional e concentração da oferta." },
    valor_aprovado_real: { label: "valor corrigido pelo IPCA", short: "Valor real", format: (v) => compactMoney.format(v), note: "Valores corrigidos para reais de junho de 2026." },
    valor_aprovado_nominal: { label: "valor nominal aprovado", short: "Valor nominal", format: (v) => compactMoney.format(v), note: "Valores correntes, sem correção da inflação." },
    valor_real_per_capita: { label: "valor real por habitante", short: "R$/habitante", format: (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(v), note: "Valor corrigido dividido pela população estimada." },
  };

  const aggregate = (rows) => {
    const qtd = rows.reduce((sum, row) => sum + row.qtd_aprovada, 0);
    const nominal = rows.reduce((sum, row) => sum + row.valor_aprovado_nominal, 0);
    const real = rows.reduce((sum, row) => sum + row.valor_aprovado_real, 0);
    const population = rows.reduce((sum, row) => sum + row.populacao, 0);
    return { qtd_aprovada: qtd, valor_aprovado_nominal: nominal, valor_aprovado_real: real, populacao: population, taxa_qtd_100k: population ? qtd / population * 100000 : 0, valor_real_per_capita: population ? real / population : 0 };
  };
  const ufRow = (uf, year) => data.rows.find((row) => row.uf === uf && row.ano === year);
  const nationalRow = (year) => aggregate(data.rows.filter((row) => row.ano === year));
  const municipalityRow = (code, year) => municipalitiesByCode[code]?.annual.find((row) => row.ano === year);
  const scopeName = () => state.municipality ? `${municipalitiesByCode[state.municipality].nome} · ${state.uf}` : state.uf === "BR" ? "Brasil" : `${state.uf} · ${ufNames[state.uf]}`;
  const scopeRow = (year) => state.municipality ? municipalityRow(state.municipality, year) : state.uf === "BR" ? nationalRow(year) : ufRow(state.uf, year);
  const scopeSeries = () => data.years.map((year) => ({ year, row: scopeRow(year) })).filter((item) => item.row);
  const change = (current, previous) => previous ? (current / previous - 1) * 100 : null;
  const signed = (value) => value == null ? "sem comparação" : `${value >= 0 ? "+" : ""}${percent.format(value)}%`;

  const populateMunicipalities = () => {
    const selected = state.uf === "BR" ? [] : data.municipalities.filter((item) => item.uf === state.uf);
    controls.municipality.innerHTML = `<option value="">Todos os municípios</option>${selected.map((item) => `<option value="${item.code}">${item.nome}</option>`).join("")}`;
    controls.municipality.disabled = state.uf === "BR";
    controls.municipality.value = state.municipality;
  };

  const renderKpis = () => {
    const row = scopeRow(state.year);
    const previous = scopeRow(String(Number(state.year) - 1));
    if (!row) return;
    $("#kpi-quantity").textContent = number.format(row.qtd_aprovada);
    $("#kpi-real-value").textContent = compactMoney.format(row.valor_aprovado_real);
    $("#kpi-rate").textContent = number.format(row.taxa_qtd_100k);
    $("#kpi-per-capita").textContent = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(row.valor_real_per_capita);
    const annualChange = previous ? change(row.qtd_aprovada, previous.qtd_aprovada) : null;
    $("#kpi-quantity-delta").textContent = `${scopeName()} · ${state.year}${annualChange == null ? "" : ` · ${signed(annualChange)} a/a`}`;
    $("#scope-chip").textContent = scopeName();
    $("#period-chip").textContent = state.year;
  };

  const makeSvg = (tag, attrs = {}) => {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };

  const renderTrend = () => {
    const series = scopeSeries();
    const config = metrics[state.metric];
    const values = series.map((item) => item.row[state.metric]);
    const minRaw = Math.min(...values); const maxRaw = Math.max(...values); const pad = (maxRaw - minRaw || Math.abs(maxRaw) || 1) * .08;
    const min = minRaw - pad; const max = maxRaw + pad;
    const x = (index) => 70 + index * (846 / Math.max(1, series.length - 1));
    const y = (value) => 28 + (max - value) * (300 / (max - min || 1));
    const grid = $("#scope-trend-grid"); const labels = $("#scope-trend-labels"); const points = $("#scope-trend-points");
    grid.replaceChildren(); labels.replaceChildren(); points.replaceChildren();
    for (let step = 0; step < 5; step += 1) {
      const gridY = 28 + step * 75; grid.append(makeSvg("line", { class: "grid", x1: 70, x2: 916, y1: gridY, y2: gridY }));
    }
    $("#scope-trend-line").setAttribute("points", series.map((item, index) => `${x(index)},${y(item.row[state.metric])}`).join(" "));
    series.forEach((item, index) => {
      if (index === 0 || index === series.length - 1 || index % 2 === 0) {
        const label = makeSvg("text", { class: "axis", x: x(index), y: 374, "text-anchor": "middle" }); label.textContent = item.year; labels.append(label);
      }
      const circle = makeSvg("circle", { class: "dynamic-point", cx: x(index), cy: y(item.row[state.metric]), r: 5, tabindex: 0, "data-index": index });
      const show = () => {
        $$(".dynamic-point").forEach((point) => point.classList.remove("selected")); circle.classList.add("selected");
        const tooltip = $("#scope-trend-tooltip"); tooltip.innerHTML = `<strong>${item.year}</strong><span>${config.short}<b>${config.format(item.row[state.metric])}</b></span>`; tooltip.hidden = false; tooltip.style.left = `${Math.min(Math.max(x(index) / 940 * 100, 12), 88)}%`;
      };
      circle.addEventListener("pointerenter", show); circle.addEventListener("focus", show); circle.addEventListener("click", show);
      points.append(circle);
    });
    $("#scope-trend-chart").addEventListener("pointerleave", () => { $("#scope-trend-tooltip").hidden = true; });
    $("#scope-trend-title").textContent = `${scopeName()} · ${config.short}`;
    $("#scope-trend-period").textContent = `${series[0]?.year || "—"}–${series.at(-1)?.year || "—"}`;
    $("#scope-trend-caption").textContent = config.note;
  };

  const renderMapAndRanking = () => {
    const config = metrics[state.metric];
    const selected = data.rows.filter((row) => row.ano === state.year).sort((a, b) => b[state.metric] - a[state.metric]);
    const values = selected.map((row) => row[state.metric]).sort((a, b) => a - b);
    const cuts = [1,2,3,4,5,6].map((n) => values[Math.floor((values.length - 1) * n / 7)]);
    selected.forEach((row) => {
      const path = document.querySelector(`[data-map-uf="${row.uf}"]`);
      const level = 1 + cuts.filter((value) => row[state.metric] > value).length;
      path?.setAttribute("class", `state seq-${level}${state.uf === row.uf ? " selected" : ""}`);
      path?.querySelector("title")?.replaceChildren(`${ufNames[row.uf]}: ${config.format(row[state.metric])}`);
    });
    $("#ranking-title").textContent = `Maiores valores · ${config.short}`;
    $("#territory-ranking").innerHTML = selected.slice(0, 5).map((row, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><button type="button" data-pick-uf="${row.uf}"><b>${row.uf}</b><small>${ufNames[row.uf]}</small></button><strong>${config.format(row[state.metric])}</strong></li>`).join("");
    const median = values[Math.floor(values.length / 2)];
    const activeUf = state.uf === "BR" ? null : selected.find((row) => row.uf === state.uf);
    if (activeUf) {
      const rank = selected.findIndex((row) => row.uf === state.uf) + 1;
      $("#territory-signal").textContent = `${scopeName()} · ${state.year}`;
      $("#territory-signal-detail").textContent = `${config.format(activeUf[state.metric])} · ${rank}ª posição entre as UFs.`;
    } else {
      $("#territory-signal").textContent = `${selected[0].uf} lidera em ${state.year}`;
      $("#territory-signal-detail").textContent = `${config.format(selected[0][state.metric])}; mediana estadual de ${config.format(median)}.`;
    }
    $("#territory-note").textContent = config.note;
  };

  const renderComparison = () => {
    const config = metrics[state.metric]; const a = ufRow(controls.compareA.value, state.year); const b = ufRow(controls.compareB.value, state.year);
    if (!a || !b) return;
    const max = Math.max(a[state.metric], b[state.metric]) || 1;
    [["a", a], ["b", b]].forEach(([key, row]) => {
      $(`#compare-${key}-name`).textContent = `${row.uf} · ${ufNames[row.uf]}`;
      $(`#compare-${key}-value`).textContent = config.format(row[state.metric]);
      const first = ufRow(row.uf, data.years[0]); const delta = first ? change(row[state.metric], first[state.metric]) : null;
      $(`#compare-${key}-change`).textContent = `${signed(delta)} desde ${data.years[0]}`;
      $(`#compare-${key}-bar`).style.setProperty("--bar", `${Math.max(4, row[state.metric] / max * 100)}%`);
    });
    const delta = change(a[state.metric], b[state.metric]); const leader = delta >= 0 ? a : b; const base = delta >= 0 ? b : a;
    $("#comparison-reading").textContent = `${leader.uf} registra ${percent.format(Math.abs(delta))}% a mais que ${base.uf} em ${config.label}. Comparação descritiva, sem inferência causal.`;
    $("#comparison-meta").textContent = `${state.year} · ${config.short}`;
  };

  const renderSignals = () => {
    const config = metrics[state.metric]; const current = scopeRow(state.year); const first = scopeRow(data.years[0]);
    const growth = first ? change(current[state.metric], first[state.metric]) : null;
    const ufRows = data.rows.filter((row) => row.ano === state.year).sort((a,b) => b[state.metric] - a[state.metric]);
    const selectedUf = state.uf === "BR" ? ufRows[0] : ufRows.find((row) => row.uf === state.uf);
    const rank = selectedUf ? ufRows.findIndex((row) => row.uf === selectedUf.uf) + 1 : null;
    const messages = [
      { n: "01", title: `${scopeName()} desde ${data.years[0]}`, text: `${signed(growth)} em ${config.label}.` },
      { n: "02", title: state.uf === "BR" ? `${ufRows[0].uf} lidera o ranking` : `${state.uf} ocupa a ${rank}ª posição`, text: `${config.format(selectedUf[state.metric])} em ${state.year}.` },
      { n: "03", title: "Leitura proporcional", text: state.metric.includes("taxa") || state.metric.includes("capita") ? "Indicador ajustado pela população estimada." : "O total absoluto também reflete porte e concentração da oferta." },
      { n: "!", title: "Competências provisórias", text: "Maio e junho de 2026 podem sofrer revisão.", warning: true },
    ];
    $("#dynamic-signals").innerHTML = messages.map((item) => `<li class="${item.warning ? "warning" : ""}"><span>${item.n}</span><div><b>${item.title}</b><p>${item.text}</p></div></li>`).join("");
  };

  const tableSource = () => {
    if (state.uf === "BR") return data.rows.filter((row) => row.ano === state.year).map((row) => ({ ...row, name: `${row.uf} · ${ufNames[row.uf]}`, kind: "UF" }));
    const municipalities = data.municipalities.filter((item) => item.uf === state.uf && (!state.municipality || item.code === state.municipality));
    return municipalities.map((item) => {
      const row = item.annual.find((annual) => annual.ano === state.year); const previous = item.annual.find((annual) => annual.ano === String(Number(state.year) - 1));
      return row ? { ...row, name: item.nome, uf: item.uf, code: item.code, growth: previous ? change(row.qtd_aprovada, previous.qtd_aprovada) : null, kind: "Município" } : null;
    }).filter(Boolean);
  };

  const renderTable = () => {
    const query = controls.search.value.trim().toLocaleLowerCase("pt-BR"); const config = metrics[state.metric];
    let rows = tableSource().map((row) => ({ ...row, growth: row.growth ?? (() => { const previous = state.uf === "BR" ? ufRow(row.uf, String(Number(state.year)-1)) : null; return previous ? change(row.qtd_aprovada, previous.qtd_aprovada) : null; })() }));
    if (query) rows = rows.filter((row) => row.name.toLocaleLowerCase("pt-BR").includes(query));
    if (controls.sort.value === "name-asc") rows.sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));
    else if (controls.sort.value === "growth-desc") rows.sort((a,b) => (b.growth ?? -Infinity) - (a.growth ?? -Infinity));
    else rows.sort((a,b) => b[state.metric] - a[state.metric]);
    state.tableRows = rows;
    $("#detail-table-body").innerHTML = rows.map((row) => `<tr><th scope="row">${row.name}<small>${row.kind}</small></th><td>${number.format(row.qtd_aprovada)}</td><td>${number.format(row.taxa_qtd_100k)}</td><td>${money.format(row.valor_aprovado_real)}</td><td>${decimal.format(row.valor_real_per_capita)}</td><td class="${(row.growth ?? 0) >= 0 ? "positive" : "negative"}">${signed(row.growth)}</td></tr>`).join("");
    $("#table-count").textContent = `${rows.length} registros · ordenado por ${config.short.toLocaleLowerCase("pt-BR")}`;
  };

  const renderAll = () => { renderKpis(); renderTrend(); renderMapAndRanking(); renderComparison(); renderSignals(); renderTable(); };
  const selectUf = (uf) => { state.uf = uf; state.municipality = ""; controls.uf.value = uf; populateMunicipalities(); renderAll(); };

  controls.year.addEventListener("change", () => { state.year = controls.year.value; renderAll(); });
  controls.metric.addEventListener("change", () => { state.metric = controls.metric.value; renderAll(); });
  controls.uf.addEventListener("change", () => selectUf(controls.uf.value));
  controls.municipality.addEventListener("change", () => { state.municipality = controls.municipality.value; renderAll(); });
  controls.compareA.addEventListener("change", renderComparison); controls.compareB.addEventListener("change", renderComparison);
  controls.search.addEventListener("input", renderTable); controls.sort.addEventListener("change", renderTable);
  $("#territory-ranking").addEventListener("click", (event) => { const button = event.target.closest("[data-pick-uf]"); if (button) selectUf(button.dataset.pickUf); });
  $$('[data-map-link]').forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); selectUf(link.dataset.mapLink); }));
  $("#reset-dashboard").addEventListener("click", () => { state.year = data.years.at(-1); state.uf = "BR"; state.municipality = ""; state.metric = "taxa_qtd_100k"; controls.year.value = state.year; controls.uf.value = "BR"; controls.metric.value = state.metric; controls.search.value = ""; populateMunicipalities(); renderAll(); });
  $("#filter-toggle").addEventListener("click", () => { const expanded = $("#filter-toggle").getAttribute("aria-expanded") === "true"; $("#filter-toggle").setAttribute("aria-expanded", String(!expanded)); $("#dashboard-filter-fields").hidden = expanded; });
  $$('[data-dashboard-view]').forEach((button) => button.addEventListener("click", () => { state.view = button.dataset.dashboardView; document.body.dataset.dashboardMode = state.view; $$('[data-dashboard-view]').forEach((item) => item.setAttribute("aria-pressed", String(item === button))); }));
  $("#export-dashboard").addEventListener("click", () => window.print());
  $("#export-table").addEventListener("click", () => {
    const header = ["territorio","procedimentos","taxa_100_mil","valor_real","valor_real_por_habitante","variacao_anual_pct"];
    const lines = state.tableRows.map((row) => [row.name,row.qtd_aprovada,row.taxa_qtd_100k,row.valor_aprovado_real,row.valor_real_per_capita,row.growth ?? ""].map((value) => `"${String(value).replaceAll('"','""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `dialisasus_${state.uf}_${state.year}.csv`; link.click(); URL.revokeObjectURL(link.href);
  });

  document.body.dataset.dashboardMode = "executive";
  populateMunicipalities(); renderAll();
})();
