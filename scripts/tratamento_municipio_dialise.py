from pathlib import Path

import numpy as np
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT_DIR / "dados_brutos"
OUT_DIR = ROOT_DIR / "dados_tratados"

ARQ_VALOR_MUNICIPIO = RAW_DIR / "valor_municipio_dialise_brasil.csv"


def br_number_to_float(value):
    if pd.isna(value):
        return np.nan
    value = str(value).strip()
    if value in {"", "-"}:
        return 0.0
    return float(value.replace(".", "").replace(",", "."))


def find_header_row(path):
    with path.open(encoding="latin1") as file:
        for index, line in enumerate(file):
            if line.startswith('"Mun') and "Total" in line:
                return index
    raise ValueError(f"Cabecalho municipal nao encontrado em {path}")


def load_valor_municipio():
    header_row = find_header_row(ARQ_VALOR_MUNICIPIO)
    df = pd.read_csv(ARQ_VALOR_MUNICIPIO, sep=";", skiprows=header_row, encoding="latin1")
    municipio_col = df.columns[0]
    df = df[df[municipio_col].astype(str).str.match(r"^\d{6}\s+")].copy()

    anos = [col for col in df.columns if str(col).isdigit()]
    for col in anos + ["Total"]:
        df[col] = df[col].map(br_number_to_float).fillna(0)

    df["cod_municipio"] = df[municipio_col].astype(str).str.extract(r"^(\d{6})")
    df["municipio"] = df[municipio_col].astype(str).str.replace(r"^\d{6}\s+", "", regex=True).str.strip()
    df["uf_ibge"] = df["cod_municipio"].str[:2]
    df = df.drop(columns=[municipio_col])
    return df, anos


def main():
    df, anos = load_valor_municipio()

    anos_completos = [str(ano) for ano in range(2015, 2024) if str(ano) in anos]
    anos_pre = [str(ano) for ano in range(2015, 2020) if str(ano) in anos]
    anos_pandemia = ["2020", "2021"]
    anos_pos = ["2022", "2023"]

    indicadores = df[["cod_municipio", "municipio", "uf_ibge"] + anos_completos].copy()
    indicadores["valor_2015_2023"] = indicadores[anos_completos].sum(axis=1)
    indicadores["media_pre_pandemia"] = indicadores[anos_pre].mean(axis=1)
    indicadores["media_pandemia"] = indicadores[anos_pandemia].mean(axis=1)
    indicadores["media_pos_pandemia"] = indicadores[anos_pos].mean(axis=1)
    indicadores["crescimento_pos_vs_pre_pct"] = np.where(
        indicadores["media_pre_pandemia"] > 0,
        (indicadores["media_pos_pandemia"] / indicadores["media_pre_pandemia"] - 1) * 100,
        np.nan,
    )
    total_nacional = indicadores["valor_2015_2023"].sum()
    indicadores["participacao_nacional_pct"] = indicadores["valor_2015_2023"] / total_nacional * 100
    indicadores = indicadores.sort_values("valor_2015_2023", ascending=False).reset_index(drop=True)
    indicadores["ranking_valor"] = indicadores.index + 1

    long_df = indicadores.melt(
        id_vars=["cod_municipio", "municipio", "uf_ibge"],
        value_vars=anos_completos,
        var_name="ano",
        value_name="valor_aprovado",
    )
    long_df["ano"] = long_df["ano"].astype(int)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_DIR / "valor_municipio_dialise_brasil_wide.csv", index=False, encoding="utf-8-sig")
    long_df.to_csv(OUT_DIR / "valor_municipio_dialise_brasil_long.csv", index=False, encoding="utf-8-sig")
    indicadores.to_csv(OUT_DIR / "indicadores_municipio_valor_brasil.csv", index=False, encoding="utf-8-sig")

    print("Municipios tratados:", len(indicadores))
    print("Total 2015-2023:", total_nacional)
    print(indicadores[["ranking_valor", "cod_municipio", "municipio", "valor_2015_2023", "crescimento_pos_vs_pre_pct"]].head(15).to_string(index=False))


if __name__ == "__main__":
    main()
