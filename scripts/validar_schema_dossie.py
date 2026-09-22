"""Valida o contrato JSON Schema e todos os documentos materializados do dossiê."""

from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[1]
DOSSIER_DIR = ROOT / "dossie"
SCHEMA_PATH = DOSSIER_DIR / "schema.json"
EXPECTED_ROOT_DOCUMENTS = {
    "glossario.json",
    "manifesto.json",
    "modelo.json",
    "nacional.json",
    "ressalvas.json",
    "territorio/distribuicao.json",
    "territorio/indice.json",
}


def main() -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())

    documents = sorted(
        path
        for path in DOSSIER_DIR.rglob("*.json")
        if path != SCHEMA_PATH
    )
    relative_documents = {path.relative_to(DOSSIER_DIR).as_posix() for path in documents}
    uf_documents = {f"territorio/uf-{uf}.json" for uf in [
        "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
        "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
    ]}
    expected_documents = EXPECTED_ROOT_DOCUMENTS | uf_documents
    if relative_documents != expected_documents:
        missing = sorted(expected_documents - relative_documents)
        unexpected = sorted(relative_documents - expected_documents)
        raise SystemExit(
            f"Conjunto canonico do dossie divergente; ausentes={missing}; inesperados={unexpected}"
        )
    errors: list[str] = []
    for path in documents:
        instance = json.loads(path.read_text(encoding="utf-8"))
        for error in validator.iter_errors(instance):
            location = "/".join(str(part) for part in error.absolute_path) or "<raiz>"
            errors.append(f"{path.relative_to(ROOT)}:{location}: {error.message}")

    if errors:
        raise SystemExit("\n".join(errors))

    print("Schema Draft 2020-12 valido: dossie/schema.json")
    print(f"Documentos do dossie validados: {len(documents)}")


if __name__ == "__main__":
    main()
