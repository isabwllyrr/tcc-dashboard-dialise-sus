const paths = {
  mensal: "../dados_tratados/dialise_mensal_brasil_total.csv",
  grupo: "../dados_tratados/indicadores_grupo_brasil.csv",
  forecast: "../dados_tratados/previsao_mensal_proximos_12m_corrigido.csv",
  comparacao: "../dados_tratados/comparacao_real_previsto_2022_atual_corrigido.csv",
  metricas: "../dados_tratados/metricas_modelos_preditivos_corrigido.csv",
  municipios: "../dados_tratados/indicadores_municipio_brasil.csv",
  mapa: "./assets/brazil-states.geojson",
};
const DATA_VERSION = "20260713-command";

const state = {
  mensal: [],
  grupo: [],
  forecast: [],
  comparacao: [],
  metricas: [],
  municipios: [],
  mapa: null,
  yearStart: 2015,
  yearEnd: 2026,
  metric: "valor_aprovado",
  region: "all",
  uf: "all",
  citySearch: "",
  territoryMetric: "valor_periodo",
};
const chartRegistry = new Map();
let renderPending = false;

const ufMeta = {
  "11": { uf: "RO", region: "Norte" }, "12": { uf: "AC", region: "Norte" }, "13": { uf: "AM", region: "Norte" },
  "14": { uf: "RR", region: "Norte" }, "15": { uf: "PA", region: "Norte" }, "16": { uf: "AP", region: "Norte" },
  "17": { uf: "TO", region: "Norte" }, "21": { uf: "MA", region: "Nordeste" }, "22": { uf: "PI", region: "Nordeste" },
  "23": { uf: "CE", region: "Nordeste" }, "24": { uf: "RN", region: "Nordeste" }, "25": { uf: "PB", region: "Nordeste" },
  "26": { uf: "PE", region: "Nordeste" }, "27": { uf: "AL", region: "Nordeste" }, "28": { uf: "SE", region: "Nordeste" },
  "29": { uf: "BA", region: "Nordeste" }, "31": { uf: "MG", region: "Sudeste" }, "32": { uf: "ES", region: "Sudeste" },
  "33": { uf: "RJ", region: "Sudeste" }, "35": { uf: "SP", region: "Sudeste" }, "41": { uf: "PR", region: "Sul" },
  "42": { uf: "SC", region: "Sul" }, "43": { uf: "RS", region: "Sul" }, "50": { uf: "MS", region: "Centro-Oeste" },
  "51": { uf: "MT", region: "Centro-Oeste" }, "52": { uf: "GO", region: "Centro-Oeste" }, "53": { uf: "DF", region: "Centro-Oeste" },
};

const fmtMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtNumber = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const fmtDecimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(field); field = ""; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (field || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
      if (char === '\r' && next === '\n') i++;
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift();
  return rows.filter(r => r.length === headers.length).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}

async function loadCSV(path) {
  const response = await fetch(`${path}${path.includes("?") ? "&" : "?"}v=${DATA_VERSION}`);
  if (!response.ok) throw new Error(`Falha ao carregar ${path}`);
  return parseCSV(await response.text());
}

async function loadJSON(path) {
  const response = await fetch(`${path}${path.includes("?") ? "&" : "?"}v=${DATA_VERSION}`);
  if (!response.ok) throw new Error(`Falha ao carregar ${path}`);
  return response.json();
}

function numeric(row, key) { return Number(row[key] || 0); }
function filteredMensal() { return state.mensal.filter(d => d.ano >= state.yearStart && d.ano <= state.yearEnd); }
function monthsInYear(year) { return new Set(state.mensal.filter(d => d.ano === year).map(d => d.mes)).size; }
function latestCompleteYear(maxYear = state.yearEnd) {
  const completeYears = [...new Set(state.mensal.map(d => d.ano))].filter(year => year <= maxYear && monthsInYear(year) === 12);
  return completeYears.length ? Math.max(...completeYears) : maxYear;
}
function formatMetricValue(key, value) {
  if (key.includes("valor") || key === "custo_medio" || key === "media_mensal" || key === "previsao_valor_aprovado") return fmtMoney.format(value);
  if (key.includes("pct")) return `${fmtDecimal.format(value)}%`;
  return fmtNumber.format(value);
}

function modelDisplayName(name) {
  const labels = {
    ridge: "Ridge Regression",
    random_forest: "Random Forest",
    gradient_boosting: "Gradient Boosting",
    linear_regression: "Regressão Linear",
    regressao_linear: "Regressão Linear",
    media_movel_12m: "Média Móvel 12m",
    tendencia_linear: "Tendência Linear",
    sazonal_ingenuo_12m: "Sazonal Ingênuo 12m",
  };
  return labels[String(name || "").toLowerCase()] || name || "-";
}

function setupFilters() {
  const years = [...new Set(state.mensal.map(d => d.ano))];
  for (const id of ["yearStart", "yearEnd"]) {
    const select = document.getElementById(id);
    select.innerHTML = years.map(y => `<option value="${y}">${y}${monthsInYear(y) < 12 ? " parcial" : ""}</option>`).join("");
  }
  document.getElementById("yearStart").value = state.yearStart;
  document.getElementById("yearEnd").value = state.yearEnd;
  document.getElementById("yearStart").addEventListener("change", e => { state.yearStart = Number(e.target.value); if (state.yearStart > state.yearEnd) state.yearEnd = state.yearStart; scheduleRender(); });
  document.getElementById("yearEnd").addEventListener("change", e => { state.yearEnd = Number(e.target.value); if (state.yearEnd < state.yearStart) state.yearStart = state.yearEnd; scheduleRender(); });
  document.getElementById("metricSelect").addEventListener("change", e => { state.metric = e.target.value; scheduleRender(); });
  document.getElementById("resetFilters")?.addEventListener("click", () => {
    state.yearStart = Math.min(...state.mensal.map(d => d.ano));
    state.yearEnd = Math.max(...state.mensal.map(d => d.ano));
    state.metric = "valor_aprovado";
    document.getElementById("yearStart").value = state.yearStart;
    document.getElementById("yearEnd").value = state.yearEnd;
    document.getElementById("metricSelect").value = state.metric;
    document.querySelectorAll("[data-range]").forEach(button => button.classList.toggle("active", button.dataset.range === "all"));
    scheduleRender();
  });
}

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-jump-tab]");
    if (!target) return;
    activateTab(target.dataset.jumpTab);
  });
  document.querySelectorAll("[data-range]").forEach(btn => btn.addEventListener("click", () => {
    const maxYear = Math.max(...state.mensal.map(d => d.ano));
    const ranges = { pre: [2015, 2019], pandemic: [2020, 2021], post: [2022, maxYear], all: [2015, maxYear] };
    [state.yearStart, state.yearEnd] = ranges[btn.dataset.range];
    document.querySelectorAll("[data-range]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("yearStart").value = state.yearStart;
    document.getElementById("yearEnd").value = state.yearEnd;
    scheduleRender();
  }));
}

function activateTab(tab) {
  const panel = document.getElementById(tab);
  const nav = document.querySelector(`.nav-item[data-tab="${tab}"]`);
  if (!panel || !nav) return;
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  nav.classList.add("active");
  panel.classList.add("active");
  document.body.dataset.activeTab = tab;
  updateSidebarContext(tab);
  if (window.matchMedia("(max-width: 960px)").matches) {
    document.body.classList.add("sidebar-collapsed");
    document.getElementById("sidebarToggle")?.setAttribute("aria-expanded", "false");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
  scheduleRender();
}

function updateSidebarContext(tab) {
  const panel = document.getElementById("filterPanel");
  const context = document.getElementById("sidebarContext");
  const filteredTabs = new Set(["temporal"]);
  if (panel) panel.hidden = !filteredTabs.has(tab);
  if (!context) return;
  const messages = {
    overview: "Visão nacional consolidada.",
    temporal: "Filtros aplicados às séries e comparações.",
    territory: "Use os filtros territoriais dentro da página.",
    forecast: "A previsão utiliza toda a série disponível.",
    methodology: "Ficha técnica do protótipo e dos modelos.",
    risk: "Simulação educativa independente do DATASUS.",
  };
  context.textContent = messages[tab] || "";
}

function setupSidebarToggle() {
  const button = document.getElementById("sidebarToggle");
  if (!button) return;
  const saved = localStorage.getItem("dialisasus-sidebar");
  if (window.matchMedia("(max-width: 960px)").matches || saved === "collapsed") {
    document.body.classList.add("sidebar-collapsed");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Mostrar filtros");
  }
  button.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("sidebar-collapsed");
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", collapsed ? "Mostrar filtros" : "Ocultar filtros");
    localStorage.setItem("dialisasus-sidebar", collapsed ? "collapsed" : "open");
    scheduleRender();
  });
  document.getElementById("sidebarClose")?.addEventListener("click", () => {
    document.body.classList.add("sidebar-collapsed");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Mostrar filtros");
    scheduleRender();
  });
}

function setupOverviewControls() {
}

function setupDetails() {
  document.querySelectorAll("details").forEach(details => {
    details.addEventListener("toggle", scheduleRender);
  });
}

function setupTerritoryFilters() {
  const regionSelect = document.getElementById("regionFilter");
  const ufSelect = document.getElementById("ufFilter");
  const cityInput = document.getElementById("citySearch");
  const territoryMetric = document.getElementById("territoryMetric");
  const exportButton = document.getElementById("exportTerritory");
  const regions = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
  regionSelect.innerHTML = `<option value="all">Brasil</option>${regions.map(r => `<option value="${r}">${r}</option>`).join("")}`;
  populateUfFilter();
  regionSelect.addEventListener("change", e => {
    state.region = e.target.value;
    state.uf = "all";
    populateUfFilter();
    scheduleRender();
  });
  ufSelect.addEventListener("change", e => {
    state.uf = e.target.value;
    scheduleRender();
  });
  cityInput.addEventListener("input", e => {
    state.citySearch = e.target.value.trim().toLocaleUpperCase("pt-BR");
    scheduleRender();
  });
  territoryMetric.addEventListener("change", e => {
    state.territoryMetric = e.target.value;
    scheduleRender();
  });
  exportButton.addEventListener("click", exportTerritoryCSV);
}

function populateUfFilter() {
  const ufSelect = document.getElementById("ufFilter");
  const ufs = Object.entries(ufMeta)
    .filter(([, meta]) => state.region === "all" || meta.region === state.region)
    .map(([code, meta]) => ({ code, ...meta }))
    .sort((a, b) => a.uf.localeCompare(b.uf));
  ufSelect.innerHTML = `<option value="all">Todas</option>${ufs.map(item => `<option value="${item.code}">${item.uf}</option>`).join("")}`;
  ufSelect.value = state.uf;
}

function setupRisk() {
  document.getElementById("riskForm").addEventListener("input", renderRisk);
  document.getElementById("exportSummary")?.addEventListener("click", exportSummaryText);
  renderRisk();
}

function renderKPIs(data) {
  if (!document.getElementById("kpiValue")) return;
  const totalValue = data.reduce((s, d) => s + d.valor_aprovado, 0);
  const totalQty = data.reduce((s, d) => s + d.qtd_aprovada, 0);
  const avg = totalValue / totalQty;
  const first = data.filter(d => d.ano === state.yearStart).reduce((s, d) => s + d.valor_aprovado, 0);
  const comparisonEnd = latestCompleteYear(state.yearEnd);
  const last = data.filter(d => d.ano === comparisonEnd).reduce((s, d) => s + d.valor_aprovado, 0);
  const growth = first ? ((last / first) - 1) * 100 : 0;
  document.getElementById("kpiValue").textContent = fmtMoney.format(totalValue);
  document.getElementById("kpiValueHint").textContent = `${state.yearStart} a ${state.yearEnd}${monthsInYear(state.yearEnd) < 12 ? " parcial" : ""}`;
  document.getElementById("kpiQty").textContent = fmtNumber.format(totalQty);
  document.getElementById("kpiAvg").textContent = fmtMoney.format(avg);
  document.getElementById("kpiGrowth").textContent = `${fmtDecimal.format(growth)}%`;
  document.getElementById("kpiGrowthHint").textContent = `${state.yearStart} x ${comparisonEnd}${comparisonEnd !== state.yearEnd ? " (ano fechado)" : ""}`;
}

function canvasBase(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  if (!canvas.closest(".tab-panel.active")) return null;
  const dpr = window.devicePixelRatio || 1;
  const shell = canvas.parentElement;
  const width = Math.max(canvas.clientWidth, shell.clientWidth - 36, 360);
  const height = Number(canvas.getAttribute("height") || 280);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  chartRegistry.set(id, []);
  return { canvas, ctx, width, height };
}

function fillRoundRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2);
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    return;
  }
  ctx.fillRect(x, y, w, h);
}

function drawPointMarkers(ctx, points, color) {
  if (!points.length) return;
  const step = Math.max(1, Math.ceil(points.length / 8));
  ctx.fillStyle = color;
  ctx.strokeStyle = "#0f1719";
  ctx.lineWidth = 2;
  points.forEach((point, index) => {
    if (index !== 0 && index % step !== 0 && index !== points.length - 1) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, index === points.length - 1 ? 4.8 : 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

function drawLine(id, data, key, color, label, extraLine = null) {
  const base = canvasBase(id); if (!base || !data.length) return;
  const { ctx, width, height } = base;
  const pad = { l: 72, r: 30, t: 30, b: 48 };
  const values = data.map(d => d[key]);
  if (extraLine) values.push(...extraLine.map(d => d.value));
  const totalCount = data.length + (extraLine?.length || 0);
  const minRaw = Math.min(...values);
  const maxRaw = Math.max(...values);
  const range = maxRaw - minRaw || maxRaw || 1;
  const min = Math.max(0, minRaw - range * 0.14);
  const max = maxRaw + range * 0.16;
  const x = i => pad.l + i * ((width - pad.l - pad.r) / Math.max(totalCount - 1, 1));
  const y = v => height - pad.b - ((v - min) / (max - min || 1)) * (height - pad.t - pad.b);
  drawAxes(ctx, width, height, pad, min, max);
  if (extraLine) {
    const boundaryX = x(data.length - 1);
    const gradient = ctx.createLinearGradient(boundaryX, 0, width - pad.r, 0);
    gradient.addColorStop(0, "rgba(249, 115, 98, 0.04)");
    gradient.addColorStop(1, "rgba(249, 115, 98, 0.12)");
    ctx.fillStyle = gradient;
    ctx.fillRect(boundaryX, pad.t, width - pad.r - boundaryX, height - pad.t - pad.b);
  }
  const points = data.map((d, i) => ({
    x: x(i),
    y: y(d[key]),
    label: d.data ? d.data.slice(0, 7) : label,
    value: d[key],
    key,
    series: label,
    type: "point",
  }));
  drawArea(ctx, points.map(p => [p.x, p.y]), height - pad.b, color);
  drawPath(ctx, points.map(p => [p.x, p.y]), color, false, 3.4);
  drawPointMarkers(ctx, points, color);
  if (extraLine) {
    const boundaryX = x(data.length - 1);
    ctx.strokeStyle = "#37545a";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(boundaryX, pad.t);
    ctx.lineTo(boundaryX, height - pad.b);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#fda89b";
    ctx.font = "700 11px Segoe UI";
    ctx.fillText("INÍCIO DA PREVISÃO", boundaryX + 9, pad.t + 14);
    const forecastPoints = extraLine.map((d, i) => ({
      x: x(data.length + i),
      y: y(d.value),
      label: d.data ? d.data.slice(0, 7) : "previsão",
      value: d.value,
      key: "valor_aprovado",
      series: "Previsão",
      type: "point",
    }));
    drawPath(ctx, forecastPoints.map(p => [p.x, p.y]), "#f97362", true, 3.2);
    drawPointMarkers(ctx, forecastPoints, "#f97362");
    points.push(...forecastPoints);
  }
  ctx.fillStyle = "#9fb3ad"; ctx.font = "700 12px Segoe UI"; ctx.fillText(label, pad.l, 18);
  drawLineLabels(ctx, [...data, ...(extraLine || []).map(d => ({ data: d.data }))], x, height, pad);
  chartRegistry.set(id, points);
}

function movingAverageRows(data, key, windowSize = 12) {
  return data.map((row, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const slice = data.slice(start, index + 1).map(d => d[key]).filter(Number.isFinite);
    const value = slice.reduce((sum, v) => sum + v, 0) / Math.max(slice.length, 1);
    return { ...row, value };
  });
}

function drawHeroTrend(id, data, key) {
  const base = canvasBase(id); if (!base || !data.length) return;
  const { ctx, width, height } = base;
  const pad = { l: 78, r: 42, t: 34, b: 56 };
  const rawValues = data.map(d => d[key]).filter(Number.isFinite);
  const avgRows = movingAverageRows(data, key, 12);
  const avgValues = avgRows.map(d => d.value).filter(Number.isFinite);
  const values = [...rawValues, ...avgValues];
  const minRaw = Math.min(...values);
  const maxRaw = Math.max(...values);
  const range = maxRaw - minRaw || maxRaw || 1;
  const min = Math.max(0, minRaw - range * 0.12);
  const max = maxRaw + range * 0.14;
  const x = i => pad.l + i * ((width - pad.l - pad.r) / Math.max(data.length - 1, 1));
  const y = v => height - pad.b - ((v - min) / (max - min || 1)) * (height - pad.t - pad.b);

  drawAxes(ctx, width, height, pad, min, max);
  const rawPoints = data.map((d, i) => ({
    x: x(i),
    y: y(d[key]),
    label: d.data ? d.data.slice(0, 7) : "mês",
    value: d[key],
    key,
    series: "Mensal",
    type: "point",
  }));
  const avgPoints = avgRows.map((d, i) => ({
    x: x(i),
    y: y(d.value),
    label: d.data ? d.data.slice(0, 7) : "média móvel",
    value: d.value,
    key,
    series: "Média móvel 12m",
    type: "point",
  }));
  drawArea(ctx, avgPoints.map(p => [p.x, p.y]), height - pad.b, "#2dd4bf");
  drawPath(ctx, rawPoints.map(p => [p.x, p.y]), "rgba(125, 211, 252, .22)", false, 1.3);
  drawPath(ctx, avgPoints.map(p => [p.x, p.y]), "rgba(45, 212, 191, .24)", false, 8);
  drawPath(ctx, avgPoints.map(p => [p.x, p.y]), "#2dd4bf", false, 4.2);

  const markers = [
    { label: data[0]?.data?.slice(0, 7), point: avgPoints[0], align: "left" },
    { label: data[data.length - 1]?.data?.slice(0, 7), point: avgPoints[avgPoints.length - 1], align: "right" },
  ].filter(m => m.point);
  markers.forEach(marker => {
    ctx.strokeStyle = "rgba(226, 255, 250, .16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marker.point.x, pad.t);
    ctx.lineTo(marker.point.x, height - pad.b);
    ctx.stroke();
    ctx.fillStyle = "#dff8f3";
    ctx.strokeStyle = "#081214";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(marker.point.x, marker.point.y, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#9fb3ad";
    ctx.font = "800 11px Segoe UI";
    ctx.textAlign = marker.align;
    ctx.fillText(marker.label || "", marker.point.x, height - 20);
  });

  const last = avgPoints[avgPoints.length - 1];
  if (last) {
    const label = formatMetricValue(key, last.value);
    ctx.font = "900 13px Segoe UI";
    const labelW = ctx.measureText(label).width + 26;
    const labelX = Math.min(width - pad.r - labelW, Math.max(pad.l, last.x - labelW - 12));
    const labelY = Math.max(pad.t + 8, last.y - 22);
    ctx.fillStyle = "rgba(8, 23, 24, .92)";
    ctx.strokeStyle = "rgba(45, 212, 191, .55)";
    ctx.lineWidth = 1;
    fillRoundRect(ctx, labelX, labelY, labelW, 30, 999);
    ctx.strokeRect(labelX + 6, labelY + .5, labelW - 12, 29);
    ctx.fillStyle = "#e8fffb";
    ctx.textAlign = "right";
    ctx.fillText(label, labelX + labelW - 13, labelY + 20);
    ctx.textAlign = "left";
  }

  ctx.textAlign = "left";
  chartRegistry.set(id, [...rawPoints, ...avgPoints]);
}

function drawSparkline(id, data, key, color, extraLine = null) {
  const base = canvasBase(id); if (!base || !data.length) return;
  const { ctx, width, height } = base;
  const pad = { l: 12, r: 12, t: 12, b: 14 };
  const actual = data.map(d => ({ data: d.data, value: d[key] })).filter(d => Number.isFinite(d.value));
  const projected = (extraLine || []).map(d => ({ data: d.data, value: d.value })).filter(d => Number.isFinite(d.value));
  const values = [...actual, ...projected].map(d => d.value);
  const min = Math.min(...values) * 0.96;
  const max = Math.max(...values) * 1.04;
  const totalCount = actual.length + projected.length;
  const x = i => pad.l + i * ((width - pad.l - pad.r) / Math.max(totalCount - 1, 1));
  const y = v => height - pad.b - ((v - min) / (max - min || 1)) * (height - pad.t - pad.b);
  ctx.strokeStyle = "rgba(159, 179, 173, .13)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const yy = pad.t + i * ((height - pad.t - pad.b) / 2);
    ctx.beginPath();
    ctx.moveTo(pad.l, yy);
    ctx.lineTo(width - pad.r, yy);
    ctx.stroke();
  }
  const points = actual.map((d, i) => [x(i), y(d.value)]);
  drawPath(ctx, points, color, false, 2.2);
  if (projected.length) {
    const boundary = x(actual.length - 1);
    ctx.strokeStyle = "rgba(249, 115, 98, .32)";
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(boundary, pad.t);
    ctx.lineTo(boundary, height - pad.b);
    ctx.stroke();
    ctx.setLineDash([]);
    drawPath(ctx, projected.map((d, i) => [x(actual.length + i), y(d.value)]), "#f97362", true, 2.2);
  }
  const last = projected[projected.length - 1] || actual[actual.length - 1];
  if (last) {
    ctx.fillStyle = projected.length ? "#f97362" : color;
    ctx.beginPath();
    ctx.arc(x(totalCount - 1), y(last.value), 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMultiLine(id, data, series) {
  const base = canvasBase(id); if (!base || !data.length) return;
  const { ctx, width, height } = base;
  const pad = { l: 62, r: 24, t: 26, b: 42 };
  const values = series.flatMap(s => data.map(d => d[s.key]).filter(Number.isFinite));
  const min = Math.min(...values) * 0.96, max = Math.max(...values) * 1.04;
  const x = i => pad.l + i * ((width - pad.l - pad.r) / Math.max(data.length - 1, 1));
  const y = v => height - pad.b - ((v - min) / (max - min || 1)) * (height - pad.t - pad.b);
  drawAxes(ctx, width, height, pad, min, max);
  const registry = [];
  series.forEach((s, sIndex) => {
    const points = data.map((d, i) => ({
      x: x(i),
      y: y(d[s.key]),
      label: d.data ? d.data.slice(0, 7) : s.label,
      value: d[s.key],
      key: s.key,
      series: s.label,
      type: "point",
    }));
    drawPath(ctx, points.map(p => [p.x, p.y]), s.color, s.dashed);
    drawPointMarkers(ctx, points, s.color);
    ctx.fillStyle = s.color;
    ctx.font = "12px Segoe UI";
    ctx.fillText(s.label, pad.l + sIndex * 86, 16);
    registry.push(...points);
  });
  drawLineLabels(ctx, data, x, height, pad);
  chartRegistry.set(id, registry);
}

function drawBar(id, rows, key, labels, color) {
  const base = canvasBase(id); if (!base || !rows.length) return;
  const { ctx, width, height } = base;
  const pad = { l: 68, r: 22, t: 28, b: 42 };
  const max = Math.max(...rows.map(r => r[key])) * 1.12;
  drawAxes(ctx, width, height, pad, 0, max);
  const gap = Math.max(10, Math.min(18, width / 70));
  const barW = (width - pad.l - pad.r - gap * (rows.length - 1)) / rows.length;
  const items = [];
  rows.forEach((r, i) => {
    const h = (r[key] / max) * (height - pad.t - pad.b);
    const bx = pad.l + i * (barW + gap);
    const by = height - pad.b - h;
    const actualW = Math.max(7, barW);
    const grad = ctx.createLinearGradient(0, by, 0, height - pad.b);
    grad.addColorStop(0, color(i));
    grad.addColorStop(1, "rgba(96, 165, 250, .48)");
    ctx.fillStyle = "rgba(148, 163, 184, .10)";
    fillRoundRect(ctx, bx, pad.t, actualW, height - pad.t - pad.b, 999);
    ctx.fillStyle = grad;
    fillRoundRect(ctx, bx, by, actualW, h, 999);
    items.push({ type: "bar", x: bx, y: by, w: actualW, h, label: labels(r), value: r[key], key });
    ctx.fillStyle = "#9fb3ad";
    ctx.font = "700 11px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(labels(r), bx + actualW / 2, height - 18);
  });
  ctx.textAlign = "left";
  chartRegistry.set(id, items);
}

function drawHorizontalBars(id, rows, key, labelFn, colorFn) {
  const base = canvasBase(id); if (!base || !rows.length) return;
  const { ctx, width, height } = base;
  const pad = { l: Math.min(210, Math.max(132, width * 0.24)), r: 104, t: 24, b: 22 };
  const max = Math.max(...rows.map(r => r[key])) * 1.08;
  const trackW = width - pad.l - pad.r;
  const rowH = (height - pad.t - pad.b) / rows.length;
  ctx.font = "700 12px Segoe UI";
  const items = [];
  rows.forEach((r, i) => {
    const y = pad.t + i * rowH + rowH * 0.28;
    const barH = Math.max(7, Math.min(18, rowH * 0.46));
    const rawLabel = String(labelFn(r));
    const label = rawLabel.length > 24 ? `${rawLabel.slice(0, 22)}...` : rawLabel;
    ctx.fillStyle = "#cbd9d5";
    ctx.textAlign = "right";
    ctx.fillText(label, pad.l - 12, y + barH * 0.76);
    ctx.fillStyle = "rgba(148, 163, 184, .11)";
    fillRoundRect(ctx, pad.l, y, trackW, barH, 999);
    const barW = Math.max(3, (r[key] / max) * trackW);
    const grad = ctx.createLinearGradient(pad.l, 0, pad.l + barW, 0);
    grad.addColorStop(0, colorFn(i));
    grad.addColorStop(1, "rgba(125, 211, 252, .92)");
    ctx.fillStyle = grad;
    fillRoundRect(ctx, pad.l, y, barW, barH, 999);
    items.push({ type: "bar", x: pad.l, y, w: barW, h: barH, label: rawLabel, value: r[key], key });
    ctx.fillStyle = "#eef7f4";
    ctx.textAlign = "left";
    ctx.font = "800 12px Segoe UI";
    ctx.fillText(formatMetricValue(key, r[key]), pad.l + Math.min(trackW + 8, barW + 10), y + barH * 0.76);
    ctx.font = "700 12px Segoe UI";
  });
  ctx.textAlign = "left";
  chartRegistry.set(id, items);
}

function drawAxes(ctx, width, height, pad, min, max) {
  ctx.strokeStyle = "rgba(148, 163, 184, .24)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.l, height - pad.b); ctx.lineTo(width - pad.r, height - pad.b); ctx.stroke();
  ctx.fillStyle = "#9fb3ad"; ctx.font = "700 11px Segoe UI";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const yy = pad.t + i * ((height - pad.t - pad.b) / 4);
    const val = max - i * ((max - min) / 4);
    ctx.fillText(compact(val), pad.l - 12, yy + 4);
    ctx.strokeStyle = i === 4 ? "rgba(148, 163, 184, .22)" : "rgba(148, 163, 184, .10)";
    ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(width - pad.r, yy); ctx.stroke();
  }
  ctx.textAlign = "left";
}

function drawLineLabels(ctx, data, x, height, pad) {
  if (!data.length) return;
  const first = data[0].data.slice(0, 7);
  const last = data[data.length - 1].data.slice(0, 7);
  ctx.fillStyle = "#9fb3ad";
  ctx.font = "11px Segoe UI";
  ctx.textAlign = "left";
  ctx.fillText(first, pad.l, height - 16);
  ctx.textAlign = "right";
  ctx.fillText(last, x(data.length - 1), height - 16);
  ctx.textAlign = "left";
}

function drawArea(ctx, points, baseline, color) {
  if (points.length < 2) return;
  const gradient = ctx.createLinearGradient(0, Math.min(...points.map(p => p[1])), 0, baseline);
  gradient.addColorStop(0, `${color}3b`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(points[0][0], baseline);
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.lineTo(x, y));
  ctx.lineTo(points[points.length - 1][0], baseline);
  ctx.closePath();
  ctx.fill();
}

function drawPath(ctx, points, color, dashed, lineWidth = 3) {
  if (!points.length) return;
  ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash(dashed ? [8, 6] : []);
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    if (i === 0) {
      ctx.moveTo(x, y);
      return;
    }
    const [px, py] = points[i - 1];
    const midX = (px + x) / 2;
    ctx.bezierCurveTo(midX, py, midX, y, x, y);
  });
  ctx.stroke(); ctx.setLineDash([]);
}

function compact(v) {
  if (v >= 1e9) return `${fmtDecimal.format(v / 1e9)} bi`;
  if (v >= 1e6) return `${fmtDecimal.format(v / 1e6)} mi`;
  return fmtNumber.format(v);
}

function renderOverview(data) {
  const labels = { valor_aprovado: "Valor aprovado", qtd_aprovada: "Quantidade aprovada", custo_medio: "Custo médio" };
  renderBrief(data);
  renderExecutiveStrip(data);
  renderMiniVisuals(data);
  renderOverviewMap();
  renderOverviewPaths();
  drawHeroTrend("overviewTrendChart", data, "valor_aprovado");
  drawLine("mainChart", data, state.metric, "#2dd4bf", labels[state.metric]);
  const annual = Object.values(data.reduce((acc, d) => {
    acc[d.ano] ||= { ano: d.ano, valor_aprovado: 0 };
    acc[d.ano].valor_aprovado += d.valor_aprovado;
    return acc;
  }, {}));
  drawBar("annualBar", annual, "valor_aprovado", r => r.ano, () => "#60a5fa");
  drawHorizontalBars("groupBar", state.grupo, "participacao_valor_pct", r => r.grupo_procedimento.replace("Procedimentos ", ""), i => ["#2dd4bf", "#f97362", "#f0b94d"][i % 3]);
}

function renderOverviewMap() {
  const map = document.getElementById("overviewBrazilMap");
  const legend = document.getElementById("overviewMapLegend");
  const spotlight = document.getElementById("overviewUfSpotlight");
  if (!map || !state.mapa || !state.municipios.length) return;
  const ufRows = aggregateUfs(state.municipios);
  const byCode = Object.fromEntries(ufRows.map(row => [row.uf_ibge, row]));
  const topUf = ufRows[0];
  const values = ufRows.map(row => row.valor_periodo).filter(Number.isFinite);
  const max = Math.max(...values, 0);
  const { project, width, height } = geoProjector(state.mapa, 620, 520, 18);
  const paths = state.mapa.features.map(feature => {
    const code = String(feature.properties.codigo_ibg);
    const data = byCode[code];
    const value = data?.valor_periodo || 0;
    const title = `${feature.properties.sigla}: ${fmtMoney.format(value)}`;
    return `<path class="map-state overview-state${data ? "" : " dim"}" data-overview-uf="${code}" d="${geoPath(feature.geometry, project)}" fill="${ufMapColor(value, max)}"><title>${title}</title></path>`;
  }).join("");
  const labels = state.mapa.features.map(feature => {
    const centroid = featureCentroid(feature.geometry, project);
    if (!centroid) return "";
    return `<text class="map-label overview-label" x="${centroid[0]}" y="${centroid[1]}">${feature.properties.sigla}</text>`;
  }).join("");
  map.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Mapa do Brasil por valor aprovado">${paths}${labels}</svg>`;
  if (legend) legend.innerHTML = `<span>menor valor</span><span class="map-scale"></span><span>maior valor</span>`;
  if (spotlight && topUf) {
    spotlight.innerHTML = `
      <article>
        <span>Maior UF</span>
        <strong>${topUf.uf}</strong>
        <small>${fmtMoney.format(topUf.valor_periodo)}</small>
      </article>
      <article>
        <span>Volume</span>
        <strong>${compact(topUf.qtd_periodo)}</strong>
        <small>${fmtMoney.format(topUf.custo_medio_periodo)} por procedimento</small>
      </article>
    `;
  }
  map.querySelectorAll("[data-overview-uf]").forEach(shape => {
    shape.addEventListener("click", () => {
      const code = shape.dataset.overviewUf;
      if (!code || !ufMeta[code]) return;
      state.uf = code;
      state.region = ufMeta[code].region;
      state.citySearch = "";
      const regionSelect = document.getElementById("regionFilter");
      const cityInput = document.getElementById("citySearch");
      if (regionSelect) regionSelect.value = state.region;
      populateUfFilter();
      const ufSelect = document.getElementById("ufFilter");
      if (ufSelect) ufSelect.value = state.uf;
      if (cityInput) cityInput.value = "";
      activateTab("territory");
    });
  });
}

function renderMiniVisuals(data) {
  if (!data.length) return;
  const totalQty = data.reduce((sum, row) => sum + row.qtd_aprovada, 0);
  const totalValue = data.reduce((sum, row) => sum + row.valor_aprovado, 0);
  const avgCost = totalQty ? totalValue / totalQty : 0;
  const forecastRows = state.forecast.map(d => ({ data: d.data, value: d.previsao_valor_aprovado }));
  const lastForecast = forecastRows[forecastRows.length - 1]?.value;
  const qtyTarget = document.getElementById("miniQtyValue");
  const avgTarget = document.getElementById("miniAvgValue");
  const forecastTarget = document.getElementById("miniForecastValue");
  if (qtyTarget) qtyTarget.textContent = compact(totalQty);
  if (avgTarget) avgTarget.textContent = fmtMoney.format(avgCost);
  if (forecastTarget) forecastTarget.textContent = Number.isFinite(lastForecast) ? compact(lastForecast) : "-";
  drawSparkline("overviewQtyMini", data, "qtd_aprovada", "#60a5fa");
  drawSparkline("overviewAvgMini", data, "custo_medio", "#f0b94d");
  drawSparkline("overviewForecastMini", state.mensal.slice(-12), "valor_aprovado", "#2dd4bf", forecastRows);
}

function periodSummaries() {
  const completeEnd = latestCompleteYear(Math.max(...state.mensal.map(d => d.ano)));
  return [
    { key: "pre", name: "Pré-pandemia", years: [2015, 2019], note: "base de comparação anterior à crise sanitária" },
    { key: "pandemic", name: "Pandemia", years: [2020, 2021], note: "período de maior restrição e reorganização assistencial" },
    { key: "post", name: "Pós-pandemia", years: [2022, completeEnd], note: "retomada e pressão assistencial recente" },
  ].map(period => {
    const rows = state.mensal.filter(d => d.ano >= period.years[0] && d.ano <= period.years[1]);
    const valor = rows.reduce((sum, row) => sum + row.valor_aprovado, 0);
    const qtd = rows.reduce((sum, row) => sum + row.qtd_aprovada, 0);
    const months = Math.max(rows.length, 1);
    return {
      ...period,
      valor,
      qtd,
      custo: valor / qtd,
      mediaMensal: valor / months,
      mediaQtdMensal: qtd / months,
    };
  });
}

function renderOverviewPaths() {
  const target = document.getElementById("overviewPaths");
  if (!target) return;
  const model = state.metricas[0];
  const lastMonth = state.mensal[state.mensal.length - 1]?.data?.slice(0, 7) || "-";
  const rows = [
    {
      tab: "temporal",
      label: "Temporal",
      metric: "Série histórica",
      text: "Mensal e anual",
    },
    {
      tab: "territory",
      label: "Território",
      metric: "Mapa e polos",
      text: "UF e município",
    },
    {
      tab: "forecast",
      label: "Previsão",
      metric: model ? `${modelDisplayName(model.modelo)} | MAPE ${fmtDecimal.format(model.MAPE_pct)}%` : lastMonth,
      text: "12 meses",
    },
  ];
  target.innerHTML = rows.map((row, index) => `
    <button class="overview-path-card" type="button" data-jump-tab="${row.tab}">
      <b>${index + 1}</b>
      <div>
        <span>${row.metric}</span>
        <strong>${row.label}</strong>
      </div>
      <p>${row.text}</p>
      <span class="path-action">Abrir</span>
    </button>
  `).join("");
}

function renderExecutiveStrip(data) {
  const target = document.getElementById("executiveStrip");
  if (!target || !data.length) return;
  const completeEnd = latestCompleteYear(state.yearEnd);
  const totalValue = data.reduce((sum, row) => sum + row.valor_aprovado, 0);
  const totalQty = data.reduce((sum, row) => sum + row.qtd_aprovada, 0);
  const avgCost = totalQty ? totalValue / totalQty : 0;
  const firstValue = data.filter(d => d.ano === state.yearStart).reduce((sum, row) => sum + row.valor_aprovado, 0);
  const lastValue = data.filter(d => d.ano === completeEnd).reduce((sum, row) => sum + row.valor_aprovado, 0);
  const valueGrowth = firstValue ? ((lastValue / firstValue) - 1) * 100 : 0;
  const firstQty = data.filter(d => d.ano === state.yearStart).reduce((sum, row) => sum + row.qtd_aprovada, 0);
  const lastQty = data.filter(d => d.ano === completeEnd).reduce((sum, row) => sum + row.qtd_aprovada, 0);
  const qtyGrowth = firstQty ? ((lastQty / firstQty) - 1) * 100 : 0;
  const model = state.metricas[0];
  target.innerHTML = `
    <article><span>Valor</span><strong>${compact(totalValue)}</strong><small>${state.yearStart}-${state.yearEnd}${monthsInYear(state.yearEnd) < 12 ? " parcial" : ""}</small></article>
    <article><span>Volume</span><strong>${compact(totalQty)}</strong><small>procedimentos</small></article>
    <article><span>Custo médio</span><strong>${fmtMoney.format(avgCost)}</strong><small>por procedimento</small></article>
    <article><span>Modelo</span><strong>${modelDisplayName(model?.modelo)}</strong><small>${model ? `MAPE ${fmtDecimal.format(model.MAPE_pct)}%` : "validação"}</small></article>
  `;
}

function renderBrief(data) {
  const completeEnd = latestCompleteYear(state.yearEnd);
  const firstYear = data.filter(d => d.ano === state.yearStart).reduce((s, d) => s + d.valor_aprovado, 0);
  const lastComplete = data.filter(d => d.ano === completeEnd).reduce((s, d) => s + d.valor_aprovado, 0);
  const growth = firstYear ? (lastComplete / firstYear - 1) * 100 : 0;
  const preQty = state.mensal.filter(d => d.ano >= 2015 && d.ano <= 2019).reduce((s, d) => s + d.qtd_aprovada, 0) / 5;
  const postYears = [...new Set(state.mensal.map(d => d.ano))].filter(y => y >= 2022 && monthsInYear(y) === 12);
  const postQty = state.mensal.filter(d => postYears.includes(d.ano)).reduce((s, d) => s + d.qtd_aprovada, 0) / Math.max(postYears.length, 1);
  const qtyGrowth = preQty ? (postQty / preQty - 1) * 100 : 0;
  const briefTitle = document.getElementById("briefTitle");
  const briefText = document.getElementById("briefText");
  const briefStats = document.getElementById("briefStats");
  if (briefTitle) briefTitle.textContent = `Pressão assistencial em alta até ${completeEnd}`;
  if (briefText) briefText.textContent = `A produção aprovada cresce junto com o valor financeiro, indicando que a leitura de gestão precisa combinar volume, território e custo.`;
  if (briefStats) briefStats.innerHTML = `
    <article><span>Pós x pré</span><strong>${fmtDecimal.format(qtyGrowth)}%</strong><small>média anual de quantidade</small></article>
    <article><span>Custo</span><strong>${fmtDecimal.format(growth)}%</strong><small>valor aprovado ${state.yearStart} x ${completeEnd}</small></article>
    <article><span>Último dado</span><strong>${state.mensal[state.mensal.length - 1].data.slice(0, 7)}</strong><small>SIA/SUS tratado</small></article>
  `;
}

function renderPeriods() {
  const groups = periodSummaries().map(period => ({
    name: period.name,
    years: period.years,
    valor_aprovado: period.valor,
    qtd_aprovada: period.qtd,
    custo_medio: period.custo,
    media_mensal: period.mediaMensal,
  }));
  document.getElementById("periodCards").innerHTML = groups.map(g => `
    <article class="period-card"><h3>${g.name}</h3><strong>${fmtMoney.format(g.media_mensal)}</strong><span>média mensal de valor aprovado</span><p>Custo médio: ${fmtMoney.format(g.custo_medio)}</p></article>
  `).join("");
  drawHorizontalBars("periodChart", groups, "media_mensal", r => r.name, i => ["#2dd4bf", "#f0b94d", "#f97362"][i]);
}

function renderForecast() {
  const recent = state.mensal.slice(-12);
  const forecastRows = state.forecast.map(d => ({ data: d.data, value: d.previsao_valor_aprovado }));
  const lastReal = state.mensal[state.mensal.length - 1]?.data?.slice(0, 7) || "último dado";
  const firstContext = recent[0]?.data?.slice(0, 7) || lastReal;
  const firstForecast = forecastRows[0]?.data?.slice(0, 7) || "próximo mês";
  const lastForecast = forecastRows[forecastRows.length - 1]?.data?.slice(0, 7) || "12 meses";
  const bestModel = state.metricas[0];
  document.getElementById("forecastNote").textContent = `${lastReal} real | ${firstForecast} a ${lastForecast} previsto`;
  document.getElementById("forecastFutureSubtitle").textContent = `${modelDisplayName(bestModel?.modelo)} aplicado à série nacional de valor aprovado.`;
  renderSelectedModelCard();
  renderForecastValidation();
  renderForecastSummary(recent, forecastRows);
  drawLine("forecastChart", recent, "valor_aprovado", "#60a5fa", `Real recente (${firstContext} a ${lastReal})`, forecastRows);
  document.getElementById("forecastTable").innerHTML = `<thead><tr><th>Mês previsto</th><th>Valor previsto</th><th>Modelo</th></tr></thead><tbody>${state.forecast.map(r => `<tr><td>${r.data.slice(0,7)}</td><td>${fmtMoney.format(r.previsao_valor_aprovado)}</td><td>${modelDisplayName(r.modelo_usado)}</td></tr>`).join("")}</tbody>`;
}

function renderForecastValidation() {
  const model = state.forecast[0]?.modelo_usado || state.metricas[0]?.modelo;
  if (!model) return;
  const rows = state.comparacao.filter(row => Number.isFinite(row[model]));
  const first = rows[0]?.data?.slice(0, 7) || "período de teste";
  const last = rows[rows.length - 1]?.data?.slice(0, 7) || "período de teste";
  const subtitle = document.getElementById("forecastValidationSubtitle");
  if (subtitle) subtitle.textContent = `Teste temporal: ${first} a ${last}.`;
  drawMultiLine("forecastValidationChart", rows, [
    { key: "valor_aprovado", label: "Real", color: "#60a5fa" },
    { key: model, label: "Previsto", color: "#f97362", dashed: true },
  ]);
}

function renderForecastGuide(firstContext, lastReal, firstForecast, lastForecast, model) {
  const target = document.getElementById("forecastGuide");
  if (!target) return;
  target.innerHTML = `
    <article><b>1</b><div><span>Real</span><strong>${firstContext} a ${lastReal}</strong></div></article>
    <article><b>2</b><div><span>Modelo</span><strong>${modelDisplayName(model?.modelo) || "selecionado"}</strong></div></article>
    <article><b>3</b><div><span>Futuro</span><strong>${firstForecast} a ${lastForecast}</strong></div></article>
  `;
}

function renderForecastSummary(recent, forecastRows) {
  const target = document.getElementById("forecastSummary");
  if (!target || !forecastRows.length) return;
  const lastObserved = recent[recent.length - 1];
  const firstForecast = forecastRows[0];
  const lastForecast = forecastRows[forecastRows.length - 1];
  const forecastGrowth = firstForecast.value ? ((lastForecast.value / firstForecast.value) - 1) * 100 : 0;
  target.innerHTML = `
    <article><span>Último real</span><strong>${fmtMoney.format(lastObserved?.valor_aprovado || 0)}</strong><small>${lastObserved?.data?.slice(0, 7) || "-"}</small></article>
    <article><span>Primeira previsão</span><strong>${fmtMoney.format(firstForecast.value)}</strong><small>${firstForecast.data.slice(0, 7)}</small></article>
    <article><span>Variação prevista</span><strong>${fmtDecimal.format(forecastGrowth)}%</strong><small>${firstForecast.data.slice(0, 7)} x ${lastForecast.data.slice(0, 7)}</small></article>
  `;
}

function renderSelectedModelCard() {
  const card = document.getElementById("selectedModelCard");
  const model = state.metricas[0];
  if (!card || !model) return;
  card.innerHTML = `
    <span>Modelo ativo</span>
    <strong>${modelDisplayName(model.modelo)}</strong>
    <small>MAPE ${fmtDecimal.format(model.MAPE_pct)}%</small>
  `;
  const diagnostics = document.getElementById("modelDiagnostics");
  if (diagnostics) diagnostics.innerHTML = `
    <article><span>MAPE médio</span><strong>${fmtDecimal.format(model.MAPE_pct)}%</strong></article>
    <article><span>MAE médio</span><strong>${fmtMoney.format(model.MAE)}</strong></article>
    <article><span>RMSE médio</span><strong>${fmtMoney.format(model.RMSE)}</strong></article>
    <article><span>Recortes</span><strong>${model.recortes}</strong></article>
  `;
}

function renderTerritory() {
  if (!state.municipios.length) return;
  const municipios = filteredMunicipios().sort((a, b) => b.valor_periodo - a.valor_periodo);
  if (!municipios.length) {
    renderEmptyTerritory();
    return;
  }
  const total = municipios.reduce((sum, row) => sum + row.valor_periodo, 0);
  const totalQty = municipios.reduce((sum, row) => sum + row.qtd_periodo, 0);
  const top = municipios[0];
  const top10 = municipios.slice(0, 10).reduce((sum, row) => sum + row.valor_periodo, 0);
  const topQty = [...municipios].sort((a, b) => b.qtd_periodo - a.qtd_periodo)[0];
  const periodLabel = state.municipios[0].periodo_analise?.replace("_", " a ") || "período";
  document.getElementById("municipalityCount").textContent = fmtNumber.format(municipios.length);
  document.getElementById("topMunicipality").textContent = top.municipio;
  document.getElementById("topMunicipalityShare").textContent = `${fmtDecimal.format((top.valor_periodo / total) * 100)}% do valor nacional`;
  document.getElementById("top10Share").textContent = `${fmtDecimal.format((top10 / total) * 100)}%`;
  document.getElementById("territoryAvgCost").textContent = fmtMoney.format(total / totalQty);
  document.getElementById("territoryAvgCostHint").textContent = `maior volume: ${topQty.municipio}`;
  document.getElementById("territoryPeriod").textContent = `Recorte territorial: ${periodLabel}. Em 2026, os dados vão até abril.`;
  document.getElementById("territoryInsight").innerHTML = territoryInsight(municipios, total, totalQty);
  document.getElementById("territoryNarrative").innerHTML = territoryNarrative(municipios, total, totalQty);
  renderTerritoryComparison(municipios, total, totalQty);
  renderUfSummary(municipios);
  renderBrazilMap(municipios);

  const regionRows = aggregateRegions(municipios);
  drawHorizontalBars("regionChart", regionRows, "valor_periodo", r => r.regiao, i => ["#2dd4bf", "#60a5fa", "#f0b94d", "#f97362", "#94a3b8"][i % 5]);

  const topValue = municipios.slice(0, 15);
  renderRankingList("municipalityValueChart", topValue, {
    key: "valor_periodo",
    label: r => `${r.municipio} - ${r.uf}`,
    value: r => fmtMoney.format(r.valor_periodo),
    rank: r => r.ranking_valor,
    color: i => i < 5 ? "#2dd4bf" : "#60a5fa",
  });

  const topQtyRows = [...municipios]
    .sort((a, b) => b.qtd_periodo - a.qtd_periodo)
    .slice(0, 15);
  renderRankingList("municipalityQtyChart", topQtyRows, {
    key: "qtd_periodo",
    label: r => `${r.municipio} - ${r.uf}`,
    value: r => fmtNumber.format(r.qtd_periodo),
    rank: r => r.ranking_qtd,
    color: i => i < 5 ? "#f97362" : "#f0b94d",
  });

  const growthRows = municipios
    .filter(r => Number.isFinite(r.crescimento_qtd_pos_vs_pre_pct) && r.media_qtd_pre_pandemia >= 10000)
    .sort((a, b) => b.crescimento_qtd_pos_vs_pre_pct - a.crescimento_qtd_pos_vs_pre_pct)
    .slice(0, 15);
  renderRankingList("municipalityGrowthChart", growthRows, {
    key: "crescimento_qtd_pos_vs_pre_pct",
    label: r => `${r.municipio} - ${r.uf}`,
    value: r => `${fmtDecimal.format(r.crescimento_qtd_pos_vs_pre_pct)}%`,
    rank: (_r, i) => i + 1,
    color: i => i < 5 ? "#2dd4bf" : "#60a5fa",
  });

  document.getElementById("municipalityTable").innerHTML = `
    <thead>
      <tr><th>Rank valor</th><th>Município</th><th>UF</th><th>Região</th><th>Valor no período</th><th>Qtd. no período</th><th>Custo médio</th><th>Cresc. valor</th><th>Cresc. qtd.</th></tr>
    </thead>
    <tbody>
      ${municipios.slice(0, 25).map(r => `
        <tr>
          <td>${r.ranking_valor}</td>
          <td>${r.municipio}</td>
          <td>${r.uf}</td>
          <td>${r.regiao}</td>
          <td>${fmtMoney.format(r.valor_periodo)}</td>
          <td>${fmtNumber.format(r.qtd_periodo)}</td>
          <td>${fmtMoney.format(r.custo_medio_periodo)}</td>
          <td>${Number.isFinite(r.crescimento_valor_pos_vs_pre_pct) ? `${fmtDecimal.format(r.crescimento_valor_pos_vs_pre_pct)}%` : "-"}</td>
      <td>${Number.isFinite(r.crescimento_qtd_pos_vs_pre_pct) ? `${fmtDecimal.format(r.crescimento_qtd_pos_vs_pre_pct)}%` : "-"}</td>
        </tr>
      `).join("")}
    </tbody>`;
}

function renderTerritoryComparison(rows, totalValue, totalQty) {
  const panel = document.getElementById("territoryComparison");
  if (!panel) return;
  const nationalValue = state.municipios.reduce((sum, row) => sum + row.valor_periodo, 0);
  const nationalQty = state.municipios.reduce((sum, row) => sum + row.qtd_periodo, 0);
  const scope = state.uf !== "all" ? `UF ${ufMeta[state.uf]?.uf}` : state.region !== "all" ? `região ${state.region}` : "Brasil";
  const valueShare = nationalValue ? (totalValue / nationalValue) * 100 : 0;
  const qtyShare = nationalQty ? (totalQty / nationalQty) * 100 : 0;
  const avgCost = totalQty ? totalValue / totalQty : 0;
  const nationalAvg = nationalQty ? nationalValue / nationalQty : 0;
  const avgDiff = nationalAvg ? ((avgCost / nationalAvg) - 1) * 100 : 0;
  panel.innerHTML = `
    <div>
      <p class="eyebrow">Comparação com Brasil</p>
      <h3>${scope}</h3>
    </div>
    <article><span>Participação no valor</span><strong>${fmtDecimal.format(valueShare)}%</strong><small>do total nacional</small></article>
    <article><span>Participação na quantidade</span><strong>${fmtDecimal.format(qtyShare)}%</strong><small>do total nacional</small></article>
    <article><span>Custo médio</span><strong>${fmtDecimal.format(avgDiff)}%</strong><small>diferença em relação ao Brasil</small></article>
  `;
}

function territoryNarrative(rows, totalValue, totalQty) {
  const top = rows[0];
  const top10 = rows.slice(0, 10).reduce((sum, row) => sum + row.valor_periodo, 0);
  const concentration = (top10 / totalValue) * 100;
  const avgCost = totalValue / totalQty;
  const regionText = state.uf !== "all" ? `na UF ${ufMeta[state.uf]?.uf}` : state.region !== "all" ? `na região ${state.region}` : "no Brasil";
  return `
    <div>
      <p class="eyebrow">Leitura dos dados</p>
      <h2>Concentração territorial e pressão assistencial ${regionText}</h2>
      <p>O recorte selecionado concentra ${fmtDecimal.format(concentration)}% do valor aprovado nos 10 maiores municípios. O maior polo é ${top.municipio} - ${top.uf}, e o custo médio observado no recorte é ${fmtMoney.format(avgCost)} por procedimento aprovado.</p>
    </div>
  `;
}

function filteredMunicipios() {
  return state.municipios.filter(row => {
    const matchesRegion = state.region === "all" || row.regiao === state.region;
    const matchesUf = state.uf === "all" || row.uf_ibge === state.uf;
    const matchesCity = !state.citySearch || row.municipio.includes(state.citySearch);
    return matchesRegion && matchesUf && matchesCity;
  });
}

function renderUfSummary(rows) {
  const box = document.getElementById("ufSummary");
  if (!box || !rows.length) return;
  const totalValue = rows.reduce((sum, row) => sum + row.valor_periodo, 0);
  const totalQty = rows.reduce((sum, row) => sum + row.qtd_periodo, 0);
  const top = [...rows].sort((a, b) => b.valor_periodo - a.valor_periodo)[0];
  const scope = state.uf !== "all" ? `UF ${ufMeta[state.uf]?.uf}` : state.region !== "all" ? state.region : "Brasil";
  box.innerHTML = `
    <article><span>Recorte</span><strong>${scope}</strong></article>
    <article><span>Valor aprovado</span><strong>${fmtMoney.format(totalValue)}</strong></article>
    <article><span>Quantidade</span><strong>${fmtNumber.format(totalQty)}</strong></article>
    <article><span>Município líder</span><strong>${top.municipio} - ${top.uf}</strong></article>
  `;
}

function renderBrazilMap(rows) {
  const map = document.getElementById("brazilMap");
  const legend = document.getElementById("ufMapLegend");
  if (!map || !state.mapa) return;
  const ufRows = aggregateUfs(rows);
  const byCode = Object.fromEntries(ufRows.map(row => [row.uf_ibge, row]));
  const metric = mapMetricConfig();
  const mapValues = ufRows.map(row => row[metric.key]).filter(Number.isFinite);
  const max = Math.max(...mapValues, 0);
  const { project, width, height } = geoProjector(state.mapa, 620, 600, 18);
  const paths = state.mapa.features.map(feature => {
    const code = String(feature.properties.codigo_ibg);
    const sigla = feature.properties.sigla;
    const data = byCode[code];
    const active = state.uf === code ? " active" : "";
    const dim = data ? "" : " dim";
    const value = data?.[metric.key] || 0;
    const title = `${sigla} - ${feature.properties.name}: ${metric.label} ${metric.format(value)}`;
    return `<path class="map-state${active}${dim}" data-uf-code="${code}" d="${geoPath(feature.geometry, project)}" fill="${ufMapColor(value, max)}"><title>${title}</title></path>`;
  }).join("");
  const labels = state.mapa.features.map(feature => {
    const centroid = featureCentroid(feature.geometry, project);
    if (!centroid) return "";
    return `<text class="map-label" x="${centroid[0]}" y="${centroid[1]}">${feature.properties.sigla}</text>`;
  }).join("");

  map.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Mapa do Brasil por UF">${paths}${labels}</svg>`;
  if (legend) {
    legend.innerHTML = `<span>menor ${metric.short}</span><span class="map-scale"></span><span>maior ${metric.short}</span>`;
  }
  map.querySelectorAll(".map-state[data-uf-code]").forEach(shape => {
    shape.addEventListener("click", () => {
      const code = shape.dataset.ufCode;
      if (!code) return;
      state.uf = state.uf === code ? "all" : code;
      state.region = state.uf === "all" ? "all" : ufMeta[state.uf].region;
      document.getElementById("regionFilter").value = state.region;
      populateUfFilter();
      document.getElementById("ufFilter").value = state.uf;
      scheduleRender();
    });
  });
}

function geoProjector(geojson, width, height, pad) {
  const coords = [];
  geojson.features.forEach(feature => collectCoordinates(feature.geometry.coordinates, coords));
  const lons = coords.map(coord => coord[0]);
  const lats = coords.map(coord => coord[1]);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const scale = Math.min((width - pad * 2) / (maxLon - minLon), (height - pad * 2) / (maxLat - minLat));
  const xOffset = (width - (maxLon - minLon) * scale) / 2;
  const yOffset = (height - (maxLat - minLat) * scale) / 2;
  return {
    width,
    height,
    project: ([lon, lat]) => [
      xOffset + (lon - minLon) * scale,
      yOffset + (maxLat - lat) * scale,
    ],
  };
}

function collectCoordinates(input, output) {
  if (typeof input?.[0] === "number") {
    output.push(input);
    return;
  }
  input.forEach(item => collectCoordinates(item, output));
}

function geoPath(geometry, project) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map(polygon => polygon.map(ring => ring.map((coord, i) => {
    const [x, y] = project(coord);
    return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z").join(" ")).join(" ");
}

function featureCentroid(geometry, project) {
  const coords = [];
  collectCoordinates(geometry.coordinates, coords);
  if (!coords.length) return null;
  const projected = coords.map(project);
  const x = projected.reduce((sum, coord) => sum + coord[0], 0) / projected.length;
  const y = projected.reduce((sum, coord) => sum + coord[1], 0) / projected.length;
  return [x.toFixed(1), y.toFixed(1)];
}

function aggregateUfs(rows) {
  const aggregated = Object.values(rows.reduce((acc, row) => {
    acc[row.uf_ibge] ||= { uf_ibge: row.uf_ibge, uf: row.uf, regiao: row.regiao, valor_periodo: 0, qtd_periodo: 0, municipios: 0, growthValues: [] };
    acc[row.uf_ibge].valor_periodo += row.valor_periodo;
    acc[row.uf_ibge].qtd_periodo += row.qtd_periodo;
    acc[row.uf_ibge].municipios += 1;
    if (Number.isFinite(row.crescimento_qtd_pos_vs_pre_pct)) acc[row.uf_ibge].growthValues.push(row.crescimento_qtd_pos_vs_pre_pct);
    return acc;
  }, {}));
  return aggregated.map(row => ({
    ...row,
    custo_medio_periodo: row.qtd_periodo ? row.valor_periodo / row.qtd_periodo : 0,
    crescimento_qtd_pos_vs_pre_pct: row.growthValues.length ? row.growthValues.reduce((sum, value) => sum + value, 0) / row.growthValues.length : 0,
  })).sort((a, b) => b.valor_periodo - a.valor_periodo);
}

function mapMetricConfig() {
  const configs = {
    valor_periodo: { key: "valor_periodo", label: "Valor aprovado", short: "valor", format: fmtMoney.format },
    qtd_periodo: { key: "qtd_periodo", label: "Quantidade aprovada", short: "quantidade", format: fmtNumber.format },
    custo_medio_periodo: { key: "custo_medio_periodo", label: "Custo médio", short: "custo", format: fmtMoney.format },
    crescimento_qtd_pos_vs_pre_pct: { key: "crescimento_qtd_pos_vs_pre_pct", label: "Crescimento pós-pandemia", short: "crescimento", format: value => `${fmtDecimal.format(value)}%` },
  };
  return configs[state.territoryMetric] || configs.valor_periodo;
}

function ufMapColor(value, max) {
  if (!value || !max) return "#1b282b";
  const t = Math.max(0.18, Math.min(1, value / max));
  const start = [27, 58, 61];
  const mid = [22, 111, 114];
  const end = [45, 212, 191];
  const range = t < 0.55 ? [start, mid, t / 0.55] : [mid, end, (t - 0.55) / 0.45];
  const rgb = range[0].map((channel, i) => Math.round(channel + (range[1][i] - channel) * range[2]));
  return `rgb(${rgb.join(",")})`;
}

function territoryInsight(rows, totalValue, totalQty) {
  const top = rows[0];
  const regionText = state.uf !== "all"
    ? `UF ${ufMeta[state.uf]?.uf || state.uf}`
    : state.region !== "all" ? `região ${state.region}` : "Brasil";
  const growthRows = rows.filter(r => Number.isFinite(r.crescimento_qtd_pos_vs_pre_pct));
  const topGrowth = growthRows.sort((a, b) => b.crescimento_qtd_pos_vs_pre_pct - a.crescimento_qtd_pos_vs_pre_pct)[0];
  return `
    <article><span>Recorte</span><strong>${regionText}</strong><small>${fmtNumber.format(rows.length)} municípios</small></article>
    <article><span>Valor acumulado</span><strong>${fmtMoney.format(totalValue)}</strong><small>${fmtNumber.format(totalQty)} procedimentos</small></article>
    <article><span>Maior polo</span><strong>${top.municipio} - ${top.uf}</strong><small>${fmtDecimal.format(top.participacao_valor_nacional_pct)}% do valor nacional</small></article>
    <article><span>Maior alta de quantidade</span><strong>${topGrowth ? `${topGrowth.municipio} - ${topGrowth.uf}` : "-"}</strong><small>${topGrowth ? `${fmtDecimal.format(topGrowth.crescimento_qtd_pos_vs_pre_pct)}% pós x pré` : "sem base comparável"}</small></article>
  `;
}

function renderEmptyTerritory() {
  document.getElementById("municipalityCount").textContent = "0";
  document.getElementById("topMunicipality").textContent = "-";
  document.getElementById("topMunicipalityShare").textContent = "sem municípios no filtro";
  document.getElementById("top10Share").textContent = "-";
  document.getElementById("territoryAvgCost").textContent = "-";
  document.getElementById("territoryAvgCostHint").textContent = "ajuste os filtros";
  document.getElementById("territoryInsight").innerHTML = `<article><span>Sem resultado</span><strong>Nenhum município encontrado</strong><small>Revise região, UF ou busca.</small></article>`;
  document.getElementById("territoryComparison").innerHTML = "";
  document.getElementById("territoryNarrative").innerHTML = "";
  document.getElementById("ufSummary").innerHTML = "";
  document.getElementById("brazilMap").innerHTML = "";
  document.getElementById("ufMapLegend").innerHTML = "";
  document.getElementById("municipalityTable").innerHTML = "";
  ["municipalityValueChart", "municipalityQtyChart", "municipalityGrowthChart"].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.innerHTML = `<div class="ranking-empty">Sem dados para o filtro atual</div>`;
  });
  ["regionChart"].forEach(id => {
    const base = canvasBase(id);
    if (base) {
      base.ctx.fillStyle = "#9fb3ad";
      base.ctx.fillText("Sem dados para o filtro atual", 24, 42);
    }
  });
}

function renderMethodology() {
  const methodPeriod = document.getElementById("methodPeriod");
  if (!methodPeriod) return;
  const lastYear = Math.max(...state.mensal.map(d => d.ano));
  const lastMonth = Math.max(...state.mensal.filter(d => d.ano === lastYear).map(d => d.mes));
  const monthLabel = String(lastMonth).padStart(2, "0");
  methodPeriod.textContent = `${state.yearStart} a ${lastYear}${monthsInYear(lastYear) < 12 ? `, parcial até ${monthLabel}/${lastYear}` : ""}`;
  renderModelComparison();
}

function renderModelComparison() {
  const target = document.getElementById("modelComparison");
  if (!target || !state.metricas.length) return;
  const rows = state.metricas
    .filter(row => row.tipo === "aprendizagem")
    .sort((a, b) => a.MAPE_pct - b.MAPE_pct);
  target.innerHTML = `
    <div class="model-row header">
      <span>Modelo</span><span>Tipo</span><span>Ranking</span><span>MAPE</span><span>RMSE</span><span>Recortes</span>
    </div>
    ${rows.map((row, index) => {
      const winner = index === 0;
      return `
        <article class="model-row ${winner ? "winner" : ""}">
          <div class="model-name">
            <strong>${modelDisplayName(row.modelo)}</strong>
            <small>${winner ? "Selecionado pelo menor MAPE médio" : "Modelo de aprendizagem testado"}</small>
          </div>
          <span class="model-badge">Aprendizagem</span>
          <span class="model-rank">${index + 1}</span>
          <strong>${fmtDecimal.format(row.MAPE_pct)}%</strong>
          <span>${fmtMoney.format(row.RMSE)}</span>
          <span>${row.recortes}</span>
        </article>
      `;
    }).join("")}
  `;
}

function renderTcc() {
  const grid = document.getElementById("tccMiniGrid");
  if (!grid || !state.mensal.length) return;
  const lastYear = Math.max(...state.mensal.map(d => d.ano));
  const lastMonth = Math.max(...state.mensal.filter(d => d.ano === lastYear).map(d => d.mes));
  const model = state.metricas[0];
  grid.innerHTML = `
    <article><span>Fonte</span><strong>SIA/SUS</strong><small>DATASUS</small></article>
    <article><span>Período</span><strong>${state.yearStart}-${lastYear}</strong><small>${monthsInYear(lastYear) < 12 ? `até ${String(lastMonth).padStart(2, "0")}/${lastYear}` : "ano fechado"}</small></article>
    <article><span>Modelo</span><strong>${modelDisplayName(model?.modelo)}</strong><small>${model ? `MAPE ${fmtDecimal.format(model.MAPE_pct)}%` : "em validação"}</small></article>
  `;
}

function renderConclusions() {
  const list = document.getElementById("findingList");
  if (!list || !state.mensal.length) return;
  const completeEnd = latestCompleteYear(Math.max(...state.mensal.map(d => d.ano)));
  const firstYear = Math.min(...state.mensal.map(d => d.ano));
  const firstValue = state.mensal.filter(d => d.ano === firstYear).reduce((sum, row) => sum + row.valor_aprovado, 0);
  const lastValue = state.mensal.filter(d => d.ano === completeEnd).reduce((sum, row) => sum + row.valor_aprovado, 0);
  const valueGrowth = firstValue ? ((lastValue / firstValue) - 1) * 100 : 0;
  const preQty = state.mensal.filter(d => d.ano >= 2015 && d.ano <= 2019).reduce((sum, row) => sum + row.qtd_aprovada, 0) / 5;
  const postYears = [...new Set(state.mensal.map(d => d.ano))].filter(year => year >= 2022 && monthsInYear(year) === 12);
  const postQty = state.mensal.filter(d => postYears.includes(d.ano)).reduce((sum, row) => sum + row.qtd_aprovada, 0) / Math.max(postYears.length, 1);
  const qtyGrowth = preQty ? ((postQty / preQty) - 1) * 100 : 0;
  const totalValue = state.municipios.reduce((sum, row) => sum + row.valor_periodo, 0);
  const top10Value = [...state.municipios].sort((a, b) => b.valor_periodo - a.valor_periodo).slice(0, 10).reduce((sum, row) => sum + row.valor_periodo, 0);
  const topCity = [...state.municipios].sort((a, b) => b.valor_periodo - a.valor_periodo)[0];
  const model = state.metricas[0];
  list.innerHTML = `
    <article><span>Demanda</span><strong>+${fmtDecimal.format(qtyGrowth)}%</strong><small>pós x pré</small></article>
    <article><span>Custo</span><strong>+${fmtDecimal.format(valueGrowth)}%</strong><small>${firstYear} x ${completeEnd}</small></article>
    <article><span>Polo</span><strong>${topCity ? topCity.municipio : "Em análise"}</strong><small>${topCity ? topCity.uf : "território"}</small></article>
    <article><span>Modelo</span><strong>${model ? modelDisplayName(model.modelo) : "Exploratório"}</strong><small>${model ? `MAPE ${fmtDecimal.format(model.MAPE_pct)}%` : "validação"}</small></article>
  `;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportTerritoryCSV() {
  const rows = filteredMunicipios().sort((a, b) => b.valor_periodo - a.valor_periodo);
  const columns = [
    ["municipio", "Município"],
    ["uf", "UF"],
    ["regiao", "Região"],
    ["valor_periodo", "Valor aprovado"],
    ["qtd_periodo", "Quantidade aprovada"],
    ["custo_medio_periodo", "Custo médio"],
    ["crescimento_valor_pos_vs_pre_pct", "Crescimento valor pós x pré (%)"],
    ["crescimento_qtd_pos_vs_pre_pct", "Crescimento qtd pós x pré (%)"],
  ];
  const content = [
    columns.map(([, label]) => csvEscape(label)).join(";"),
    ...rows.map(row => columns.map(([key]) => csvEscape(row[key])).join(";")),
  ].join("\n");
  const blob = new Blob([`\ufeff${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const scope = state.uf !== "all" ? ufMeta[state.uf]?.uf : state.region !== "all" ? state.region : "brasil";
  link.href = url;
  link.download = `dialise_territorio_${String(scope).toLowerCase().replaceAll(" ", "_")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportSummaryText() {
  const completeEnd = latestCompleteYear(Math.max(...state.mensal.map(d => d.ano)));
  const model = state.metricas[0];
  const brief = document.getElementById("briefTitle")?.innerText || "";
  const findings = [...document.querySelectorAll("#findingList article")].map(item => `- ${item.innerText}`).join("\n");
  const limitations = [...document.querySelectorAll("#overview .overview-limitations .finding-list.muted article")].map(item => `- ${item.innerText}`).join("\n");
  const content = [
    "Resumo do protótipo DialisaSUS - Diálise no SUS",
    "",
    `Período analisado: ${state.yearStart} a ${state.yearEnd}`,
    `Ano fechado de referência: ${completeEnd}`,
    model ? `Modelo de aprendizagem: ${modelDisplayName(model.modelo)} | MAPE médio: ${fmtDecimal.format(model.MAPE_pct)}%` : "Modelo de aprendizagem: em validação",
    "",
    brief,
    "",
    "Achados principais",
    findings,
    "",
    "Limitações da análise",
    limitations,
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "resumo_dashboard_dialise_sus.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function aggregateRegions(rows) {
  return Object.values(rows.reduce((acc, row) => {
    acc[row.regiao] ||= { regiao: row.regiao, valor_periodo: 0, qtd_periodo: 0 };
    acc[row.regiao].valor_periodo += row.valor_periodo;
    acc[row.regiao].qtd_periodo += row.qtd_periodo;
    return acc;
  }, {})).sort((a, b) => b.valor_periodo - a.valor_periodo);
}

function renderRankingList(id, rows, config) {
  const element = document.getElementById(id);
  if (!element) return;
  if (!rows.length) {
    element.innerHTML = `<div class="ranking-empty">Sem dados para o filtro atual</div>`;
    return;
  }
  const max = Math.max(...rows.map(row => row[config.key]), 1);
  element.innerHTML = rows.map((row, index) => {
    const width = Math.max(3, (row[config.key] / max) * 100);
    const label = config.label(row);
    const rank = config.rank(row, index);
    return `
      <article class="ranking-row" title="${label}: ${config.value(row)}">
        <div class="ranking-name">
          <span class="ranking-rank">${rank}</span>
          <span class="ranking-label">${label}</span>
        </div>
        <div class="ranking-track" aria-hidden="true">
          <span class="ranking-fill" style="--bar-width:${width.toFixed(2)}%; --bar-color:${config.color(index)}"></span>
        </div>
        <strong class="ranking-value">${config.value(row)}</strong>
      </article>
    `;
  }).join("");
}

function renderRisk() {
  const form = document.getElementById("riskForm"); if (!form) return;
  const age = Number(document.getElementById("riskAge").value || 0);
  const egfr = Number(document.getElementById("riskEgfr").value || 0);
  const albumin = Number(document.getElementById("riskAlbumin").value || 0);
  let points = age >= 60 ? 1 : 0;
  const factors = [];
  form.querySelectorAll("input[type='checkbox']:checked").forEach(input => { points += Number(input.value); factors.push(input.dataset.label); });
  if (egfr < 60) { points += 4; factors.push("eGFR baixo"); } else if (egfr < 90) points += 1;
  if (albumin >= 300) { points += 4; factors.push("albuminúria muito elevada"); } else if (albumin >= 30) { points += 3; factors.push("albuminúria elevada"); }
  let risk = "Baixo", cls = "low", text = "Sem excluir risco real. Pessoas com fatores de risco devem manter acompanhamento de rotina.";
  if (egfr < 30 || albumin >= 300 || points >= 9) { risk = "Alto"; cls = "high"; text = "Resultado de alerta. Recomenda-se avaliação profissional e investigação laboratorial conforme contexto clínico."; }
  else if (egfr < 60 || albumin >= 30 || points >= 5) { risk = "Moderado"; cls = "moderate"; text = "Fatores de risco ou exames sugerem necessidade de acompanhamento e rastreio adequado."; }
  const box = document.getElementById("riskResult");
  box.className = `risk-result ${cls}`;
  box.innerHTML = `<span>Classificação simulada</span><strong>${risk}</strong><p>Pontuação educativa: ${points}</p><p>${text}</p><p><b>Fatores:</b> ${factors.length ? factors.join(", ") : "nenhum marcado"}</p>`;
}

function render() {
  const data = filteredMensal();
  renderKPIs(data);
  renderOverview(data);
  renderPeriods();
  renderForecast();
  renderTerritory();
  renderMethodology();
  renderTcc();
  renderConclusions();
  renderRisk();
}

function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  setTimeout(() => {
    renderPending = false;
    render();
  }, 0);
}

function setupChartTooltips() {
  const tooltip = document.getElementById("chartTooltip");
  document.querySelectorAll("canvas").forEach(canvas => {
    canvas.addEventListener("mousemove", event => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const items = chartRegistry.get(canvas.id) || [];
      let hit = null;
      for (const item of items) {
        if (item.type === "point") {
          const distance = Math.hypot(item.x - x, item.y - y);
          if (distance <= 12 && (!hit || distance < hit.distance)) hit = { ...item, distance };
        } else if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) {
          hit = item;
        }
      }
      if (!hit) {
        tooltip.style.display = "none";
        return;
      }
      tooltip.innerHTML = `<strong>${hit.label}</strong><span>${hit.series || "Indicador"}: ${formatMetricValue(hit.key, hit.value)}</span>`;
      tooltip.style.left = `${event.clientX + 14}px`;
      tooltip.style.top = `${event.clientY + 14}px`;
      tooltip.style.display = "block";
    });
    canvas.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
  });
}

async function init() {
  const [mensal, grupo, forecast, comparacao, metricas, municipios, mapa] = await Promise.all([loadCSV(paths.mensal), loadCSV(paths.grupo), loadCSV(paths.forecast), loadCSV(paths.comparacao), loadCSV(paths.metricas), loadCSV(paths.municipios), loadJSON(paths.mapa)]);
  state.mapa = mapa;
  state.mensal = mensal.map(d => ({ ...d, ano: Number(d.ano), mes: Number(d.mes), valor_aprovado: numeric(d, "valor_aprovado"), qtd_aprovada: numeric(d, "qtd_aprovada"), custo_medio: numeric(d, "custo_medio") }));
  state.yearStart = Math.min(...state.mensal.map(d => d.ano));
  state.yearEnd = Math.max(...state.mensal.map(d => d.ano));
  document.getElementById("brandPeriod").textContent = `${state.yearStart}-${state.yearEnd}`;
  state.grupo = grupo.map(d => ({
    ...d,
    valor_aprovado: numeric(d, "valor_aprovado"),
    qtd_aprovada: numeric(d, "qtd_aprovada"),
    custo_medio: numeric(d, "custo_medio"),
    participacao_valor_pct: numeric(d, "participacao_valor_pct"),
  }));
  state.forecast = forecast.map(d => ({ ...d, previsao_valor_aprovado: numeric(d, "previsao_valor_aprovado") }));
  state.comparacao = comparacao.map(d => {
    const row = { ...d };
    Object.keys(row).forEach(key => {
      if (key !== "data") row[key] = numeric(row, key);
    });
    return row;
  });
  state.metricas = metricas.map(d => ({
    ...d,
    MAE: numeric(d, "MAE"),
    RMSE: numeric(d, "RMSE"),
    MAPE_pct: numeric(d, "MAPE_pct"),
    MAPE_desvio_pct: d.MAPE_desvio_pct === "" ? NaN : numeric(d, "MAPE_desvio_pct"),
    recortes: d.recortes || "",
  }));
  state.municipios = municipios.map(d => ({
    ...d,
    uf: ufMeta[d.uf_ibge]?.uf || d.uf_ibge,
    regiao: ufMeta[d.uf_ibge]?.region || "Não identificado",
    ranking_valor: Number(d.ranking_valor),
    ranking_qtd: Number(d.ranking_qtd),
    valor_periodo: numeric(d, "valor_periodo"),
    qtd_periodo: numeric(d, "qtd_periodo"),
    custo_medio_periodo: numeric(d, "custo_medio_periodo"),
    media_valor_pre_pandemia: numeric(d, "media_valor_pre_pandemia"),
    media_qtd_pre_pandemia: numeric(d, "media_qtd_pre_pandemia"),
    crescimento_valor_pos_vs_pre_pct: d.crescimento_valor_pos_vs_pre_pct === "" ? NaN : numeric(d, "crescimento_valor_pos_vs_pre_pct"),
    crescimento_qtd_pos_vs_pre_pct: d.crescimento_qtd_pos_vs_pre_pct === "" ? NaN : numeric(d, "crescimento_qtd_pos_vs_pre_pct"),
    participacao_valor_nacional_pct: numeric(d, "participacao_valor_nacional_pct"),
    participacao_qtd_nacional_pct: numeric(d, "participacao_qtd_nacional_pct"),
  }));
  setupFilters(); setupNavigation(); setupSidebarToggle(); setupOverviewControls(); setupDetails(); setupTerritoryFilters(); setupRisk(); setupChartTooltips(); updateSidebarContext("overview"); render();
}

window.addEventListener("resize", scheduleRender);
init().catch(err => { document.body.innerHTML = `<main class="main"><h1>Erro ao carregar dashboard</h1><p>${err.message}</p></main>`; });



