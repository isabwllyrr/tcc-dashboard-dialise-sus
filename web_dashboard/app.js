const paths = {
  mensal: "../dados_tratados/dialise_mensal_brasil_total.csv",
  grupo: "../dados_tratados/indicadores_grupo_brasil.csv",
  forecast: "../dados_tratados/previsao_mensal_2024.csv",
};

const state = { mensal: [], grupo: [], forecast: [], yearStart: 2015, yearEnd: 2023, metric: "valor_aprovado" };

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
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Falha ao carregar ${path}`);
  return parseCSV(await response.text());
}

function numeric(row, key) { return Number(row[key] || 0); }
function filteredMensal() { return state.mensal.filter(d => d.ano >= state.yearStart && d.ano <= state.yearEnd); }

function setupFilters() {
  const years = [...new Set(state.mensal.map(d => d.ano))];
  for (const id of ["yearStart", "yearEnd"]) {
    const select = document.getElementById(id);
    select.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
  }
  document.getElementById("yearStart").value = state.yearStart;
  document.getElementById("yearEnd").value = state.yearEnd;
  document.getElementById("yearStart").addEventListener("change", e => { state.yearStart = Number(e.target.value); if (state.yearStart > state.yearEnd) state.yearEnd = state.yearStart; render(); });
  document.getElementById("yearEnd").addEventListener("change", e => { state.yearEnd = Number(e.target.value); if (state.yearEnd < state.yearStart) state.yearStart = state.yearEnd; render(); });
  document.getElementById("metricSelect").addEventListener("change", e => { state.metric = e.target.value; render(); });
}

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
    render();
  }));
  document.querySelectorAll("[data-range]").forEach(btn => btn.addEventListener("click", () => {
    const ranges = { pre: [2015, 2019], pandemic: [2020, 2021], post: [2022, 2023], all: [2015, 2023] };
    [state.yearStart, state.yearEnd] = ranges[btn.dataset.range];
    document.querySelectorAll("[data-range]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("yearStart").value = state.yearStart;
    document.getElementById("yearEnd").value = state.yearEnd;
    render();
  }));
}

function setupRisk() {
  document.getElementById("riskForm").addEventListener("input", renderRisk);
  renderRisk();
}

function renderKPIs(data) {
  const totalValue = data.reduce((s, d) => s + d.valor_aprovado, 0);
  const totalQty = data.reduce((s, d) => s + d.qtd_aprovada, 0);
  const avg = totalValue / totalQty;
  const first = data.filter(d => d.ano === state.yearStart).reduce((s, d) => s + d.valor_aprovado, 0);
  const last = data.filter(d => d.ano === state.yearEnd).reduce((s, d) => s + d.valor_aprovado, 0);
  const growth = first ? ((last / first) - 1) * 100 : 0;
  document.getElementById("kpiValue").textContent = fmtMoney.format(totalValue);
  document.getElementById("kpiValueHint").textContent = `${state.yearStart} a ${state.yearEnd}`;
  document.getElementById("kpiQty").textContent = fmtNumber.format(totalQty);
  document.getElementById("kpiAvg").textContent = fmtMoney.format(avg);
  document.getElementById("kpiGrowth").textContent = `${fmtDecimal.format(growth)}%`;
}

function canvasBase(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = canvas.getAttribute("height") * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, canvas.height);
  return { canvas, ctx, width: rect.width, height: Number(canvas.getAttribute("height")) };
}

function drawLine(id, data, key, color, label, extraLine = null) {
  const base = canvasBase(id); if (!base || !data.length) return;
  const { ctx, width, height } = base;
  const pad = { l: 62, r: 22, t: 22, b: 42 };
  const values = data.map(d => d[key]);
  if (extraLine) values.push(...extraLine.map(d => d.value));
  const min = Math.min(...values) * 0.96, max = Math.max(...values) * 1.04;
  const x = i => pad.l + i * ((width - pad.l - pad.r) / Math.max(data.length - 1, 1));
  const y = v => height - pad.b - ((v - min) / (max - min || 1)) * (height - pad.t - pad.b);
  drawAxes(ctx, width, height, pad, min, max);
  drawPath(ctx, data.map((d, i) => [x(i), y(d[key])]), color, false);
  if (extraLine) {
    const startIndex = data.length - extraLine.length;
    drawPath(ctx, extraLine.map((d, i) => [x(startIndex + i), y(d.value)]), "#d85b42", true);
  }
  ctx.fillStyle = "#69777b"; ctx.font = "12px Segoe UI"; ctx.fillText(label, pad.l, 14);
}

function drawBar(id, rows, key, labels, color) {
  const base = canvasBase(id); if (!base || !rows.length) return;
  const { ctx, width, height } = base;
  const pad = { l: 54, r: 18, t: 20, b: 58 };
  const max = Math.max(...rows.map(r => r[key])) * 1.12;
  drawAxes(ctx, width, height, pad, 0, max);
  const gap = 8;
  const barW = (width - pad.l - pad.r - gap * (rows.length - 1)) / rows.length;
  rows.forEach((r, i) => {
    const h = (r[key] / max) * (height - pad.t - pad.b);
    const bx = pad.l + i * (barW + gap);
    const by = height - pad.b - h;
    ctx.fillStyle = color(i);
    ctx.fillRect(bx, by, Math.max(6, barW), h);
    ctx.fillStyle = "#69777b";
    ctx.font = "11px Segoe UI";
    ctx.save();
    ctx.translate(bx + barW / 2, height - 38);
    ctx.rotate(-0.55);
    ctx.fillText(labels(r), 0, 0);
    ctx.restore();
  });
}

function drawAxes(ctx, width, height, pad, min, max) {
  ctx.strokeStyle = "#d9e2de"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, height - pad.b); ctx.lineTo(width - pad.r, height - pad.b); ctx.stroke();
  ctx.fillStyle = "#69777b"; ctx.font = "11px Segoe UI";
  for (let i = 0; i <= 4; i++) {
    const yy = pad.t + i * ((height - pad.t - pad.b) / 4);
    const val = max - i * ((max - min) / 4);
    ctx.fillText(compact(val), 8, yy + 4);
    ctx.strokeStyle = "#eef3f0";
    ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(width - pad.r, yy); ctx.stroke();
  }
}

function drawPath(ctx, points, color, dashed) {
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash(dashed ? [8, 6] : []);
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke(); ctx.setLineDash([]);
}

function compact(v) {
  if (v >= 1e9) return `${fmtDecimal.format(v / 1e9)} bi`;
  if (v >= 1e6) return `${fmtDecimal.format(v / 1e6)} mi`;
  return fmtNumber.format(v);
}

function renderOverview(data) {
  const labels = { valor_aprovado: "Valor aprovado", qtd_aprovada: "Quantidade aprovada", custo_medio: "Custo médio" };
  drawLine("mainChart", data, state.metric, "#0f766e", labels[state.metric]);
  const annual = Object.values(data.reduce((acc, d) => {
    acc[d.ano] ||= { ano: d.ano, valor_aprovado: 0 };
    acc[d.ano].valor_aprovado += d.valor_aprovado;
    return acc;
  }, {}));
  drawBar("annualBar", annual, "valor_aprovado", r => r.ano, () => "#3066be");
  drawBar("groupBar", state.grupo, "valor_aprovado", r => r.grupo_procedimento.split(" ").slice(0,2).join(" "), i => ["#0f766e", "#d85b42", "#c2841a"][i % 3]);
}

function renderPeriods() {
  const groups = [
    { name: "Pré-pandemia", years: [2015, 2019] },
    { name: "Pandemia", years: [2020, 2021] },
    { name: "Pós-pandemia", years: [2022, 2023] },
  ].map(p => {
    const rows = state.mensal.filter(d => d.ano >= p.years[0] && d.ano <= p.years[1]);
    const value = rows.reduce((s, d) => s + d.valor_aprovado, 0);
    const qty = rows.reduce((s, d) => s + d.qtd_aprovada, 0);
    return { ...p, valor_aprovado: value, qtd_aprovada: qty, custo_medio: value / qty, media_mensal: value / rows.length };
  });
  document.getElementById("periodCards").innerHTML = groups.map(g => `
    <article class="period-card"><h3>${g.name}</h3><strong>${fmtMoney.format(g.media_mensal)}</strong><span>média mensal de valor aprovado</span><p>Custo médio: ${fmtMoney.format(g.custo_medio)}</p></article>
  `).join("");
  drawBar("periodChart", groups, "media_mensal", r => r.name, i => ["#0f766e", "#c2841a", "#d85b42"][i]);
}

function renderForecast() {
  const recent = state.mensal.filter(d => d.ano >= 2022);
  const forecastRows = state.forecast.map(d => ({ data: d.data, value: d.previsao_valor_aprovado }));
  const combined = [...recent, ...forecastRows.map(d => ({ data: d.data, valor_aprovado: d.value }))];
  drawLine("forecastChart", combined, "valor_aprovado", "#3066be", "Real 2022-2023 + previsão 2024", forecastRows);
  document.getElementById("forecastTable").innerHTML = `<thead><tr><th>Mês</th><th>Previsão</th><th>Modelo</th></tr></thead><tbody>${state.forecast.map(r => `<tr><td>${r.data.slice(0,7)}</td><td>${fmtMoney.format(r.previsao_valor_aprovado)}</td><td>${r.modelo_usado}</td></tr>`).join("")}</tbody>`;
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
  renderRisk();
}

async function init() {
  const [mensal, grupo, forecast] = await Promise.all([loadCSV(paths.mensal), loadCSV(paths.grupo), loadCSV(paths.forecast)]);
  state.mensal = mensal.map(d => ({ ...d, ano: Number(d.ano), mes: Number(d.mes), valor_aprovado: numeric(d, "valor_aprovado"), qtd_aprovada: numeric(d, "qtd_aprovada"), custo_medio: numeric(d, "custo_medio") }));
  state.grupo = grupo.map(d => ({ ...d, valor_aprovado: numeric(d, "valor_aprovado"), qtd_aprovada: numeric(d, "qtd_aprovada"), custo_medio: numeric(d, "custo_medio") }));
  state.forecast = forecast.map(d => ({ ...d, previsao_valor_aprovado: numeric(d, "previsao_valor_aprovado") }));
  setupFilters(); setupNavigation(); setupRisk(); render();
}

window.addEventListener("resize", render);
init().catch(err => { document.body.innerHTML = `<main class="main"><h1>Erro ao carregar dashboard</h1><p>${err.message}</p></main>`; });
