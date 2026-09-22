"""Contraprova independente da Onda 0.2 do DialisaSUS.

O script le diretamente as extracoes brutas do TabNet e do IPCA, sem
importar funcoes do pipeline de producao. Ele mede a mascara de `-`, sorteia
uma amostra cega deterministica, reconstitui os casos notorios e recalcula a
coorte municipal de 2015. Opcionalmente, reconcilia os resultados com um
checkout tratado e com uma worktree candidata.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal, getcontext
from pathlib import Path
from typing import Any


getcontext().prec = 40

YEARS_CLOSED = [str(year) for year in range(2015, 2026)]
SAMPLE_SEED = "contraprova-onda0-2-2026-09-16"
SAMPLE_SIZE = 12

UF_BY_PREFIX = {
    "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA",
    "16": "AP", "17": "TO", "21": "MA", "22": "PI", "23": "CE",
    "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE",
    "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
    "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT",
    "52": "GO", "53": "DF",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_br_decimal(raw: str | None) -> Decimal | None:
    if raw is None:
        return None
    text = str(raw).strip()
    if text in {"", "-"}:
        return None
    return Decimal(text.replace(".", "").replace(",", "."))


def load_tabnet_municipal(path: Path) -> dict[str, Any]:
    lines = path.read_text(encoding="latin1").splitlines()
    header_index = next(
        index
        for index, line in enumerate(lines)
        if line.startswith('"Mun') and "Total" in line
    )
    reader = csv.DictReader(lines[header_index:], delimiter=";")
    municipality_column = reader.fieldnames[0]
    rows: dict[str, dict[str, Any]] = {}
    for row in reader:
        label = str(row.get(municipality_column, "")).strip()
        match = re.match(r"^(\d{6})\s+(.+)$", label)
        if not match:
            continue
        code, name = match.groups()
        rows[code] = {
            "code": code,
            "name": name.strip(),
            "uf": UF_BY_PREFIX.get(code[:2], code[:2]),
            "raw": {key: row.get(key) for key in reader.fieldnames[1:]},
            "value": {
                key: parse_br_decimal(row.get(key)) for key in reader.fieldnames[1:]
            },
        }
    return {
        "path": str(path),
        "hash_sha256": sha256(path),
        "fields": reader.fieldnames,
        "rows": rows,
    }


def load_ipca_factors(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        table = list(csv.reader(source, delimiter=";"))
    header_index = next(
        index for index, row in enumerate(table)
        if len(row) > 10 and row[0] == "Cód." and re.search(r"\b2015$", row[2])
    )
    header = table[header_index]
    brasil = next(row for row in table[header_index + 1:] if row and row[0] == "1")

    values_by_year: dict[int, list[Decimal]] = defaultdict(list)
    chronological: list[tuple[str, Decimal]] = []
    for label, raw in zip(header[2:], brasil[2:]):
        year_match = re.search(r"(\d{4})$", label)
        value = parse_br_decimal(raw)
        if year_match and value is not None:
            year = int(year_match.group(1))
            values_by_year[year].append(value)
            chronological.append((label, value))

    base_label, base_value = chronological[-1]
    annual_mean = {
        year: sum(values) / Decimal(len(values))
        for year, values in values_by_year.items()
    }
    factors = {year: base_value / mean for year, mean in annual_mean.items()}
    return {
        "path": str(path),
        "hash_sha256": sha256(path),
        "base_label": base_label,
        "base_index": base_value,
        "annual_mean": annual_mean,
        "factors": factors,
    }


def dash_mask(dataset: dict[str, Any]) -> set[tuple[str, str]]:
    return {
        (code, year)
        for code, row in dataset["rows"].items()
        for year in YEARS_CLOSED
        if str(row["raw"].get(year, "")).strip() == "-"
    }


def hashed_sample(keys: set[tuple[str, str]]) -> list[tuple[str, str]]:
    def score(key: tuple[str, str]) -> str:
        payload = f"{SAMPLE_SEED}|{key[0]}|{key[1]}".encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    return sorted(keys, key=lambda key: (score(key), key))[:SAMPLE_SIZE]


def load_treated_long(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        rows = list(reader)
    index = {
        (str(row.get("cod_municipio", "")).zfill(6), str(row.get("ano", ""))): row
        for row in rows
    }
    return {
        "path": str(path),
        "hash_sha256": sha256(path),
        "fields": reader.fieldnames,
        "rows": rows,
        "index": index,
    }


def is_blank(value: Any) -> bool:
    return value is None or str(value).strip() == ""


def is_numeric_zero(value: Any) -> bool:
    if is_blank(value):
        return False
    try:
        return Decimal(str(value)) == 0
    except Exception:
        return False


def audit_treated(
    path: Path,
    expected_dash_mask: set[tuple[str, str]],
) -> dict[str, Any]:
    if not path.exists():
        return {"exists": False, "path": str(path)}
    treated = load_treated_long(path)
    closed_rows = [
        row for row in treated["rows"] if str(row.get("ano", "")) in YEARS_CLOSED
    ]
    semantic_mask = {
        (str(row.get("cod_municipio", "")).zfill(6), str(row.get("ano", "")))
        for row in closed_rows
        if row.get("estado_registro") == "sem_registro"
    }
    raw_dash_rows = [
        treated["index"].get(key) for key in sorted(expected_dash_mask)
    ]
    found_rows = [row for row in raw_dash_rows if row is not None]
    both_zero = sum(
        is_numeric_zero(row.get("valor_aprovado"))
        and is_numeric_zero(row.get("qtd_aprovada"))
        for row in found_rows
    )
    both_blank = sum(
        is_blank(row.get("valor_aprovado")) and is_blank(row.get("qtd_aprovada"))
        for row in found_rows
    )
    correct_state_and_null = sum(
        row.get("estado_registro") == "sem_registro"
        and is_blank(row.get("valor_aprovado"))
        and is_blank(row.get("qtd_aprovada"))
        for row in found_rows
    )
    return {
        "exists": True,
        "path": treated["path"],
        "hash_sha256": treated["hash_sha256"],
        "row_count_closed_years": len(closed_rows),
        "has_estado_registro": "estado_registro" in (treated["fields"] or []),
        "raw_dash_rows_found": len(found_rows),
        "raw_dash_rows_both_zero": both_zero,
        "raw_dash_rows_both_blank": both_blank,
        "raw_dash_rows_correct_state_and_null": correct_state_and_null,
        "sem_registro_count_closed_years": len(semantic_mask),
        "sem_registro_mask_matches_raw": semantic_mask == expected_dash_mask,
        "index": treated["index"],
    }


def name_lookup(dataset: dict[str, Any], expected_name: str) -> tuple[str, dict[str, Any]]:
    normalized = expected_name.upper()
    matches = [
        (code, row)
        for code, row in dataset["rows"].items()
        if row["name"].upper() == normalized
    ]
    if len(matches) != 1:
        raise AssertionError(f"Esperado um municipio chamado {expected_name}: {matches}")
    return matches[0]


def notorious_cases(
    quantity: dict[str, Any],
    value: dict[str, Any],
    quantity_update: dict[str, Any],
    value_update: dict[str, Any],
) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for name in ["PARNAMIRIM", "MAUA", "ESTRELA"]:
        code, q_row = name_lookup(quantity, name)
        _, v_row = name_lookup(value, name)
        q_update = quantity_update["rows"].get(code)
        v_update = value_update["rows"].get(code)
        q_base_2026 = q_row["value"].get("2026")
        q_add_2026 = q_update["value"].get("2026") if q_update else None
        v_base_2026 = v_row["value"].get("2026")
        v_add_2026 = v_update["value"].get("2026") if v_update else None
        result[name] = {
            "code": code,
            "uf": q_row["uf"],
            "quantity_raw": {
                year: q_row["raw"].get(year) for year in [*YEARS_CLOSED, "2026"]
            },
            "value_raw": {
                year: v_row["raw"].get(year) for year in [*YEARS_CLOSED, "2026"]
            },
            "quantity_2026_base_jan_apr": q_base_2026,
            "quantity_2026_update_may_jun": q_add_2026,
            "quantity_2026_combined": (
                (q_base_2026 or Decimal(0)) + (q_add_2026 or Decimal(0))
                if q_base_2026 is not None or q_add_2026 is not None else None
            ),
            "value_2026_base_jan_apr": v_base_2026,
            "value_2026_update_may_jun": v_add_2026,
            "value_2026_combined": (
                (v_base_2026 or Decimal(0)) + (v_add_2026 or Decimal(0))
                if v_base_2026 is not None or v_add_2026 is not None else None
            ),
        }
    return result


def calculate_cohort(
    value: dict[str, Any],
    ipca: dict[str, Any],
) -> dict[str, Any]:
    factor_2015 = ipca["factors"][2015]
    factor_2025 = ipca["factors"][2025]
    cohort: list[dict[str, Any]] = []
    for code, row in value["rows"].items():
        nominal_2015 = row["value"].get("2015")
        nominal_2025 = row["value"].get("2025")
        if nominal_2015 is None:
            continue
        real_2015 = nominal_2015 * factor_2015
        if real_2015 <= Decimal("2000000"):
            continue
        real_2025 = nominal_2025 * factor_2025 if nominal_2025 is not None else None
        variation = (
            (real_2025 / real_2015 - Decimal(1)) * Decimal(100)
            if real_2025 is not None else None
        )
        cohort.append({
            "code": code,
            "name": row["name"],
            "uf": row["uf"],
            "nominal_2015": nominal_2015,
            "real_2015": real_2015,
            "nominal_2025": nominal_2025,
            "real_2025": real_2025,
            "variation_pct": variation,
        })
    cohort.sort(key=lambda row: row["code"])
    observed = [row for row in cohort if row["real_2025"] is not None]
    missing = [row for row in cohort if row["real_2025"] is None]
    declines = [row for row in observed if row["variation_pct"] < 0]

    # Contrafactual diagnostico: o resultado que surgiria ao coagir as sete
    # ausencias para zero. Nao e usado no resultado correto da coorte.
    coerced_variations = [
        (
            ((row["real_2025"] or Decimal(0)) / row["real_2015"] - Decimal(1))
            * Decimal(100)
        )
        for row in cohort
    ]
    return {
        "ipca_factor_2015": factor_2015,
        "ipca_factor_2025": factor_2025,
        "cohort_count": len(cohort),
        "observed_2025_count": len(observed),
        "missing_2025_count": len(missing),
        "missing_2025": [
            {"code": row["code"], "name": row["name"], "uf": row["uf"]}
            for row in missing
        ],
        "declines_count": len(declines),
        "declines_share_comparable_pct": Decimal(len(declines)) / Decimal(len(observed)) * 100,
        "missing_variations_are_null": all(row["variation_pct"] is None for row in missing),
        "coerced_zero_declines_count": sum(value < 0 for value in coerced_variations),
        "coerced_zero_minus_100_count": sum(value == -100 for value in coerced_variations),
        "coerced_zero_share_pct": (
            Decimal(sum(value < 0 for value in coerced_variations))
            / Decimal(len(cohort)) * 100
        ),
    }


def script_guard(repo: Path, candidate: Path | None) -> dict[str, Any]:
    def inspect(root: Path) -> dict[str, Any]:
        treatment = root / "scripts" / "tratamento_municipio_dialise.py"
        validator = root / "scripts" / "validar_dados.py"
        treatment_text = treatment.read_text(encoding="utf-8") if treatment.exists() else ""
        validator_text = validator.read_text(encoding="utf-8") if validator.exists() else ""
        return {
            "treatment_path": str(treatment),
            "treatment_sha256": sha256(treatment) if treatment.exists() else None,
            "validator_path": str(validator),
            "validator_sha256": sha256(validator) if validator.exists() else None,
            "treatment_has_estado_registro": "estado_registro" in treatment_text,
            "treatment_dash_branch_returns_zero": bool(re.search(
                r'if\s+value\s+in\s+\{[^}]*"-"[^}]*\}:\s*\n\s*return\s+0(?:\.0)?',
                treatment_text,
            )),
            "treatment_fillna_zero_occurrences": treatment_text.count("fillna(0)"),
            "validator_checks_sem_registro": "sem_registro" in validator_text,
            "validator_checks_fabricated_zero": "zero fabricado" in validator_text,
            "validator_checks_growth_guard": (
                "crescimento_valor_pos_vs_pre_pct calculado" in validator_text
            ),
        }

    result = {"checkout": inspect(repo)}
    if candidate is not None and candidate.exists():
        result["candidate"] = inspect(candidate)
    return result


def to_jsonable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return format(value, "f")
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {
            str(key): to_jsonable(item)
            for key, item in value.items()
            if key != "index"
        }
    if isinstance(value, (list, tuple, set)):
        return [to_jsonable(item) for item in value]
    return value


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--candidate", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    repo = args.repo.resolve()
    candidate = args.candidate.resolve() if args.candidate else None
    raw = repo / "dados_brutos"

    quantity = load_tabnet_municipal(raw / "qtd_municipio_dialise_brasil.csv")
    value = load_tabnet_municipal(raw / "valor_municipio_dialise_brasil.csv")
    quantity_update = load_tabnet_municipal(raw / "atualizacao_2026_05_06_qtd_municipio.csv")
    value_update = load_tabnet_municipal(raw / "atualizacao_2026_05_06_valor_municipio.csv")
    ipca = load_ipca_factors(raw / "ipca_ibge_indice_2015_2026_06.csv")

    quantity_mask = dash_mask(quantity)
    value_mask = dash_mask(value)
    sample_keys = hashed_sample(quantity_mask)
    checkout_audit = audit_treated(
        repo / "dados_tratados" / "municipio_dialise_brasil_long.csv",
        quantity_mask,
    )
    candidate_audit = None
    if candidate is not None:
        candidate_audit = audit_treated(
            candidate / "dados_tratados" / "municipio_dialise_brasil_long.csv",
            quantity_mask,
        )

    sample = []
    for code, year in sample_keys:
        row = quantity["rows"][code]
        checkout_row = checkout_audit.get("index", {}).get((code, year))
        candidate_row = (
            candidate_audit.get("index", {}).get((code, year))
            if candidate_audit else None
        )
        sample.append({
            "code": code,
            "municipality": row["name"],
            "uf": row["uf"],
            "year": year,
            "raw_quantity": quantity["rows"][code]["raw"].get(year),
            "raw_value": value["rows"][code]["raw"].get(year),
            "checkout_value": checkout_row.get("valor_aprovado") if checkout_row else None,
            "checkout_quantity": checkout_row.get("qtd_aprovada") if checkout_row else None,
            "checkout_state": checkout_row.get("estado_registro") if checkout_row else None,
            "candidate_value": candidate_row.get("valor_aprovado") if candidate_row else None,
            "candidate_quantity": candidate_row.get("qtd_aprovada") if candidate_row else None,
            "candidate_state": candidate_row.get("estado_registro") if candidate_row else None,
        })

    evidence = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "method": {
            "source": "raw TabNet municipal CSVs plus raw SIDRA IPCA CSV",
            "parser": "independent Python stdlib csv + Decimal; no production imports",
            "grain": "municipality-year",
            "closed_period": "2015-2025",
            "blind_sample_seed": SAMPLE_SEED,
            "blind_sample_size": SAMPLE_SIZE,
        },
        "raw_files": {
            "quantity": {key: val for key, val in quantity.items() if key != "rows"},
            "value": {key: val for key, val in value.items() if key != "rows"},
            "quantity_update": {key: val for key, val in quantity_update.items() if key != "rows"},
            "value_update": {key: val for key, val in value_update.items() if key != "rows"},
            "ipca": {
                "path": ipca["path"], "hash_sha256": ipca["hash_sha256"],
                "base_label": ipca["base_label"], "base_index": ipca["base_index"],
            },
        },
        "dash_cells": {
            "municipality_count_quantity": len(quantity["rows"]),
            "municipality_count_value": len(value["rows"]),
            "years_count": len(YEARS_CLOSED),
            "cells_per_file": len(quantity["rows"]) * len(YEARS_CLOSED),
            "quantity_dash_count": len(quantity_mask),
            "value_dash_count": len(value_mask),
            "masks_identical": quantity_mask == value_mask,
            "share_pct": Decimal(len(quantity_mask)) / Decimal(len(quantity["rows"]) * len(YEARS_CLOSED)) * 100,
            "blind_sample": sample,
        },
        "notorious_cases": notorious_cases(quantity, value, quantity_update, value_update),
        "cohort_2015_real_above_2m": calculate_cohort(value, ipca),
        "treated_reconciliation": {
            "checkout": checkout_audit,
            "candidate": candidate_audit,
        },
        "method_guard": script_guard(repo, candidate),
    }
    jsonable = to_jsonable(evidence)
    rendered = json.dumps(jsonable, ensure_ascii=False, indent=2, sort_keys=True)
    if args.output:
        output = args.output.resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
