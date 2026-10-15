const form = document.querySelector("#territory-selector");
const yearSelect = document.querySelector("#territory-year");
const ufSelect = document.querySelector("#territory-uf");
const dataNode = document.querySelector("#territory-data");
const compareA = document.querySelector("#territory-compare-a");
const compareB = document.querySelector("#territory-compare-b");
const compareMetric = document.querySelector("#territory-compare-metric");

if (form && yearSelect && ufSelect && dataNode && compareA && compareB && compareMetric) {
  const rows = JSON.parse(dataNode.textContent || "[]");
  const format = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  const params = new URLSearchParams(location.search);
  const svgNS = "http://www.w3.org/2000/svg";
  const initialYear = params.get("ano");

  if (initialYear && [...yearSelect.options].some((option) => option.value === initialYear)) {
    yearSelect.value = initialYear;
  }

  const render = (year) => {
    const selected = rows.filter((row) => row.ano === year);
    const ordered = selected.map((row) => row.taxa).filter(Number.isFinite).sort((a, b) => a - b);
    const thresholds = [1, 2, 3, 4, 5, 6].map(
      (step) => ordered[Math.floor(((ordered.length - 1) * step) / 7)],
    );

    selected.forEach((row) => {
      const level = 1 + thresholds.filter((value) => row.taxa > value).length;
      const path = document.querySelector(`[data-map-uf="${row.uf}"]`);
      path?.setAttribute("class", `state seq-${level}`);
      path?.querySelector("title")?.replaceChildren(`${row.uf}: ${format.format(row.taxa)} por 100 mil`);

      const tableRow = document.querySelector(`[data-table-uf="${row.uf}"]`);
      tableRow?.querySelector('[data-field="taxa"]')?.replaceChildren(format.format(row.taxa));
      tableRow?.querySelector('[data-field="qtd"]')?.replaceChildren(format.format(row.qtd));
      tableRow?.querySelector('[data-field="pop"]')?.replaceChildren(format.format(row.pop));
    });

    document.querySelector("#territory-meta")?.replaceChildren(`${year} · por 100 mil`);
    history.replaceState(null, "", `${location.pathname}?ano=${encodeURIComponent(year)}`);
  };

  const change = (current, first) => (first ? (current / first - 1) * 100 : 0);

  const renderCompare = () => {
    const metric = compareMetric.value;
    const validRow = (row) => row.uf && row.ano && Number.isFinite(row[metric]);
    const a = rows
      .filter((row) => row.uf === compareA.value && validRow(row))
      .sort((left, right) => left.ano.localeCompare(right.ano));
    const b = rows
      .filter((row) => row.uf === compareB.value && validRow(row))
      .sort((left, right) => left.ano.localeCompare(right.ano));

    const lineA = document.querySelector("#territory-line-a");
    const lineB = document.querySelector("#territory-line-b");
    const grid = document.querySelector("#territory-compare-grid");
    const labels = document.querySelector("#territory-compare-labels");
    const points = document.querySelector("#territory-compare-points");
    const reading = document.querySelector("#territory-compare-reading");
    const meta = document.querySelector("#territory-compare-meta");

    if (!a.length || !b.length || !lineA || !lineB || !grid || !labels || !points || !reading || !meta) {
      if (reading) reading.innerHTML = "<p>Não há uma série comparável disponível para este recorte.</p>";
      return;
    }

    const years = [...new Set([...a, ...b].map((row) => row.ano))].sort();
    const yearIndex = new Map(years.map((year, index) => [year, index]));
    const allValues = [...a, ...b].map((row) => row[metric]);
    const minRaw = Math.min(...allValues);
    const maxRaw = Math.max(...allValues);
    const padding = (maxRaw - minRaw || maxRaw || 1) * 0.08;
    const min = minRaw - padding;
    const max = maxRaw + padding;
    const x = (year) => 58 + (yearIndex.get(year) || 0) * (806 / Math.max(1, years.length - 1));
    const y = (value) => 24 + (max - value) * (260 / (max - min || 1));

    const pointsFor = (series) => series.map((row) => `${x(row.ano)},${y(row[metric])}`).join(" ");
    lineA.setAttribute("points", pointsFor(a));
    lineB.setAttribute("points", pointsFor(b));
    grid.replaceChildren();
    labels.replaceChildren();
    points.replaceChildren();

    for (let step = 0; step < 4; step += 1) {
      const gridY = 24 + step * (260 / 3);
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", "58");
      line.setAttribute("x2", "864");
      line.setAttribute("y1", String(gridY));
      line.setAttribute("y2", String(gridY));
      line.setAttribute("class", "grid");
      grid.append(line);
    }

    years.forEach((year, index) => {
      if (index === 0 || index === years.length - 1 || index % 2 === 0) {
        const label = document.createElementNS(svgNS, "text");
        label.setAttribute("x", String(x(year)));
        label.setAttribute("y", "322");
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("class", "axis");
        label.textContent = year;
        labels.append(label);
      }
    });

    [[a, "a"], [b, "b"]].forEach(([series, key]) => {
      series.forEach((row) => {
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", String(x(row.ano)));
        circle.setAttribute("cy", String(y(row[metric])));
        circle.setAttribute("r", "4");
        circle.setAttribute("class", `territory-dot dot-${key}`);
        const title = document.createElementNS(svgNS, "title");
        title.textContent = `${row.uf} · ${row.ano}: ${format.format(row[metric])}`;
        circle.append(title);
        points.append(circle);
      });
    });

    const aLast = a.at(-1);
    const bLast = b.at(-1);
    const aGrowth = change(aLast[metric], a[0][metric]);
    const bGrowth = change(bLast[metric], b[0][metric]);
    const leader = aLast[metric] >= bLast[metric] ? aLast : bLast;
    const other = leader === aLast ? bLast : aLast;
    const gap = change(leader[metric], other[metric]);

    reading.innerHTML = `<span>Leitura comparativa</span><h3>${leader.uf} apresenta o maior valor em ${leader.ano}</h3><p><b>${leader.uf}</b> registra ${format.format(Math.abs(gap))}% acima de ${other.uf} no último ano. No período, ${aLast.uf} variou ${aGrowth >= 0 ? "+" : ""}${format.format(aGrowth)}% e ${bLast.uf}, ${bGrowth >= 0 ? "+" : ""}${format.format(bGrowth)}%.</p><div class="compare-key"><i class="key-a"></i>${aLast.uf}<i class="key-b"></i>${bLast.uf}</div><small>Comparação descritiva; produção por local de atendimento não mede prevalência.</small>`;
    meta.textContent = `${years[0]}–${years.at(-1)} · ${metric === "taxa" ? "por 100 mil" : "procedimentos"}`;
  };

  render(yearSelect.value);
  renderCompare();
  yearSelect.addEventListener("change", () => render(yearSelect.value));
  compareA.addEventListener("change", renderCompare);
  compareB.addEventListener("change", renderCompare);
  compareMetric.addEventListener("change", renderCompare);
  form.addEventListener("submit", (event) => {
    if (ufSelect.value) {
      event.preventDefault();
      location.href = `/evidencias/territorio/${ufSelect.value}/?ano=${encodeURIComponent(yearSelect.value)}`;
    }
  });
}
