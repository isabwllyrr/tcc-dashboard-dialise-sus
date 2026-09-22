import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function readDossie<T = any>(relativePath: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), "dossie", relativePath), "utf8")) as T;
}

export const ptInt = (value: number | null | undefined) =>
  value == null ? "—" : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);

export const ptNumber = (value: number | null | undefined, digits = 1) =>
  value == null ? "—" : new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

export const ptPercent = (value: number | null | undefined, digits = 1) =>
  value == null ? "—" : `${value >= 0 ? "+" : ""}${ptNumber(value, digits)}%`;

export const ptMoney = (value: number | null | undefined, compact = false) => {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 2 : 0,
  }).format(value);
};

export const labelModel = (value: string) => ({
  holt_winters: "Holt–Winters",
  gradient_boosting: "Gradient Boosting",
  random_forest: "Random Forest",
  regressao_linear: "Regressão linear",
  ridge: "Ridge",
  sazonal_ingenuo: "Sazonal ingênuo",
}[value] || value.replaceAll("_", " "));

export function linePoints(values: number[], width = 940, height = 390) {
  const left = 70;
  const right = 24;
  const top = 26;
  const bottom = 48;
  const finite = values.filter(Number.isFinite);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  return values.map((value, index) => {
    if (!Number.isFinite(value)) return null;
    const x = left + index * ((width - left - right) / Math.max(1, values.length - 1));
    const y = top + (max - value) * ((height - top - bottom) / span);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
}

export function pointSegments(points: Array<string | null>) {
  const segments: string[] = [];
  let current: string[] = [];
  for (const point of points) {
    if (point) current.push(point);
    else if (current.length) { segments.push(current.join(" ")); current = []; }
  }
  if (current.length) segments.push(current.join(" "));
  return segments;
}
