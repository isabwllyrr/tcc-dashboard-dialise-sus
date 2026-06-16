from pathlib import Path

import numpy as np
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT_DIR / "dados_brutos"
OUT_DIR = ROOT_DIR / "dados_tratados"

ARQ_VALOR_MUNICIPIO = RAW_DIR / "valor_municipio_dialise_brasil.csv"
ARQ_QTD_MUNICIPIO = RAW_DIR / "qtd_municipio_dialise_brasil.csv"

ANO_INICIO = 2015
ANOS_PRE = [str(ano) for ano in range(2015, 2020)]
ANOS_PANDEMIA = ["2020", "2021"]


def br_number_to_float(value):
    if pd.isna(value):
        return np.nan
    if isinstance(value, (int, float, np.integer, np.floating)):
        return float(value)
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


def load_municipio_file(path, metric_name):
    header_row = find_header_row(path)
    df = pd.read_csv(path, sep=";", skiprows=header_row, encoding="latin1")
    municipio_col = df.columns[0]
    df = df[df[municipio_col].astype(str).str.match(r"^\d{6}\s+")].copy()

    anos = [col for col in df.columns if str(col).isdigit()]
    for col in anos + ["Total"]:
        if col in df.columns:
            df[col] = df[col].map(br_number_to_float).fillna(0)

    df["cod_municipio"] = df[municipio_col].astype(str).str.extract(r"^(\d{6})")
    df["municipio"] = df[municipio_col].astype(str).str.replace(r"^\d{6}\s+", "", regex=True).str.strip()
    df["uf_ibge"] = df["cod_municipio"].str[:2]

    anos_disponiveis = [ano for ano in anos if int(ano) >= ANO_INICIO]
    wide_cols = ["cod_municipio", "municipio", "uf_ibge"] + anos_disponiveis
    wide = df[wide_cols].copy()

    long = wide.melt(
        id_vars=["cod_municipio", "municipio", "uf_ibge"],
        value_vars=anos_disponiveis,
        var_name="ano",
        value_name=metric_name,
    )
    long["ano"] = long["ano"].astype(int)
    return wide, long, anos_disponiveis


def safe_divide(numerator, denominator):
    return np.where(denominator > 0, numerator / denominator, np.nan)


def period_mean(df, years):
    cols = [year for year in years if year in df.columns]
    return df[cols].mean(axis=1)


def build_indicators(valor_wide, qtd_wide, anos_analise):
    base_cols = ["cod_municipio", "municipio", "uf_ibge"]
    indicadores = valor_wide[base_cols].copy()
    periodo_label = f"{anos_analise[0]}_{anos_analise[-1]}"
    anos_fechados = anos_analise[:-1] if anos_analise[-1] == "2026" else anos_analise
    anos_pos = [year for year in anos_fechados if int(year) >= 2022]

    valor_years = valor_wide.set_index("cod_municipio")
    qtd_years = qtd_wide.set_index("cod_municipio")
    for year in anos_analise:
        indicadores[f"valor_{year}"] = indicadores["cod_municipio"].map(valor_years[year]).fillna(0)
        indicadores[f"qtd_{year}"] = indicadores["cod_municipio"].map(qtd_years[year]).fillna(0)

    valor_cols = [f"valor_{year}" for year in anos_analise]
    qtd_cols = [f"qtd_{year}" for year in anos_analise]
    indicadores["periodo_analise"] = periodo_label
    indicadores["valor_periodo"] = indicadores[valor_cols].sum(axis=1)
    indicadores["qtd_periodo"] = indicadores[qtd_cols].sum(axis=1)
    indicadores["custo_medio_periodo"] = safe_divide(
        indicadores["valor_periodo"], indicadores["qtd_periodo"]
    )

    for period_name, years in {
        "pre_pandemia": ANOS_PRE,
        "pandemia": ANOS_PANDEMIA,
        "pos_pandemia": anos_pos,
    }.items():
        indicadores[f"media_valor_{period_name}"] = period_mean(
            indicadores.rename(columns={f"valor_{year}": year for year in anos_analise}), years
        )
        indicadores[f"media_qtd_{period_name}"] = period_mean(
            indicadores.rename(columns={f"qtd_{year}": year for year in anos_analise}), years
        )

    indicadores["crescimento_valor_pos_vs_pre_pct"] = safe_divide(
        indicadores["media_valor_pos_pandemia"], indicadores["media_valor_pre_pandemia"]
    )
    indicadores["crescimento_valor_pos_vs_pre_pct"] = (
        indicadores["crescimento_valor_pos_vs_pre_pct"] - 1
    ) * 100
    indicadores["crescimento_qtd_pos_vs_pre_pct"] = safe_divide(
        indicadores["media_qtd_pos_pandemia"], indicadores["media_qtd_pre_pandemia"]
    )
    indicadores["crescimento_qtd_pos_vs_pre_pct"] = (
        indicadores["crescimento_qtd_pos_vs_pre_pct"] - 1
    ) * 100

    total_valor = indicadores["valor_periodo"].sum()
    total_qtd = indicadores["qtd_periodo"].sum()
    indicadores["participacao_valor_nacional_pct"] = indicadores["valor_periodo"] / total_valor * 100
    indicadores["participacao_qtd_nacional_pct"] = indicadores["qtd_periodo"] / total_qtd * 100

    indicadores = indicadores.sort_values("valor_periodo", ascending=False).reset_index(drop=True)
    indicadores["ranking_valor"] = indicadores.index + 1
    indicadores["ranking_qtd"] = indicadores["qtd_periodo"].rank(method="first", ascending=False).astype(int)
    return indicadores


def main():
    valor_wide, valor_long, _ = load_municipio_file(ARQ_VALOR_MUNICIPIO, "valor_aprovado")
    qtd_wide, qtd_long, _ = load_municipio_file(ARQ_QTD_MUNICIPIO, "qtd_aprovada")
    anos_analise = [
        year
        for year in valor_wide.columns
        if str(year).isdigit() and year in qtd_wide.columns and int(year) >= ANO_INICIO
    ]

    long_df = valor_long.merge(
        qtd_long,
        on=["cod_municipio", "municipio", "uf_ibge", "ano"],
        how="outer",
    ).fillna({"valor_aprovado": 0, "qtd_aprovada": 0})
    long_df["custo_medio"] = safe_divide(long_df["valor_aprovado"], long_df["qtd_aprovada"])
    long_df = long_df.sort_values(["ano", "uf_ibge", "municipio"]).reset_index(drop=True)

    indicadores = build_indicators(valor_wide, qtd_wide, anos_analise)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    valor_wide.to_csv(OUT_DIR / "valor_municipio_dialise_brasil_wide.csv", index=False, encoding="utf-8-sig")
    qtd_wide.to_csv(OUT_DIR / "qtd_municipio_dialise_brasil_wide.csv", index=False, encoding="utf-8-sig")
    long_df.to_csv(OUT_DIR / "municipio_dialise_brasil_long.csv", index=False, encoding="utf-8-sig")
    indicadores.to_csv(OUT_DIR / "indicadores_municipio_brasil.csv", index=False, encoding="utf-8-sig")

    print("Municipios tratados:", len(indicadores))
    print(f"Periodo municipal: {anos_analise[0]} a {anos_analise[-1]}")
    print("Valor total no periodo:", indicadores["valor_periodo"].sum())
    print("Quantidade total no periodo:", indicadores["qtd_periodo"].sum())
    print(
        indicadores[
            [
                "ranking_valor",
                "ranking_qtd",
                "cod_municipio",
                "municipio",
                "valor_periodo",
                "qtd_periodo",
                "custo_medio_periodo",
                "crescimento_valor_pos_vs_pre_pct",
                "crescimento_qtd_pos_vs_pre_pct",
            ]
        ]
        .head(15)
        .to_string(index=False)
    )


if __name__ == "__main__":
    main()
