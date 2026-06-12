from pathlib import Path

import numpy as np
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT_DIR / "dados_brutos"
OUT_DIR = ROOT_DIR / "dados_tratados"

ARQ_VALOR = RAW_DIR / "valor_mensal_dialise_brasil.csv"
ARQ_QTD = RAW_DIR / "qtd_mensal_dialise_brasil.csv"

MESES = {
    "Janeiro": 1,
    "Fevereiro": 2,
    "Marco": 3,
    "Março": 3,
    "Mar�o": 3,
    "Abril": 4,
    "Maio": 5,
    "Junho": 6,
    "Julho": 7,
    "Agosto": 8,
    "Setembro": 9,
    "Outubro": 10,
    "Novembro": 11,
    "Dezembro": 12,
}


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
            if "Ano/m" in line and "Total" in line:
                return index
    raise ValueError(f"Cabecalho da tabela nao encontrado em {path}")


def load_tabnet_monthly(path, value_name):
    header_row = find_header_row(path)
    df = pd.read_csv(path, sep=";", skiprows=header_row, encoding="latin1")
    df = df.rename(columns={df.columns[0]: "ano_mes"})

    # Mantem apenas linhas mensais, como "Janeiro/2015", "..Janeiro/2015" ou "  Janeiro/2021".
    df["ano_mes"] = df["ano_mes"].astype(str).str.replace("..", "", regex=False).str.strip()
    month_pattern = r"^(Janeiro|Fevereiro|Marco|Março|Mar�o|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)/\d{4}$"
    df = df[df["ano_mes"].str.match(month_pattern, na=False)].copy()

    df["mes_nome"] = df["ano_mes"].str.extract(r"^([^/]+)")
    df["ano"] = df["ano_mes"].str.extract(r"/(\d{4})").astype(int)
    df["mes"] = df["mes_nome"].map(MESES).astype(int)
    df["data"] = pd.to_datetime(dict(year=df["ano"], month=df["mes"], day=1))

    group_cols = [col for col in df.columns if col not in {"ano_mes", "mes_nome", "ano", "mes", "data", "Total"}]
    for col in group_cols:
        df[col] = df[col].map(br_number_to_float)

    return df.melt(
        id_vars=["data", "ano", "mes", "mes_nome"],
        value_vars=group_cols,
        var_name="grupo_procedimento",
        value_name=value_name,
    )


def main():
    valor = load_tabnet_monthly(ARQ_VALOR, "valor_aprovado")
    qtd = load_tabnet_monthly(ARQ_QTD, "qtd_aprovada")

    base = valor.merge(
        qtd,
        on=["data", "ano", "mes", "mes_nome", "grupo_procedimento"],
        how="outer",
    )
    base = base[base["ano"] >= 2015].copy()
    base["valor_aprovado"] = base["valor_aprovado"].fillna(0)
    base["qtd_aprovada"] = base["qtd_aprovada"].fillna(0)
    base["custo_medio"] = np.where(
        base["qtd_aprovada"] > 0,
        base["valor_aprovado"] / base["qtd_aprovada"],
        np.nan,
    )
    base = base.sort_values(["data", "grupo_procedimento"]).reset_index(drop=True)

    total_mensal = (
        base.groupby(["data", "ano", "mes"], as_index=False)
        .agg(valor_aprovado=("valor_aprovado", "sum"), qtd_aprovada=("qtd_aprovada", "sum"))
    )
    total_mensal["custo_medio"] = total_mensal["valor_aprovado"] / total_mensal["qtd_aprovada"]

    total_anual = (
        total_mensal.groupby("ano", as_index=False)
        .agg(valor_aprovado=("valor_aprovado", "sum"), qtd_aprovada=("qtd_aprovada", "sum"))
    )
    meses_por_ano = total_mensal.groupby("ano")["mes"].nunique().rename("meses_disponiveis")
    total_anual = total_anual.merge(meses_por_ano, on="ano", how="left")
    total_anual["ano_completo"] = total_anual["meses_disponiveis"] == 12
    total_anual["custo_medio"] = total_anual["valor_aprovado"] / total_anual["qtd_aprovada"]
    total_anual["variacao_valor_pct"] = total_anual["valor_aprovado"].pct_change() * 100
    total_anual.loc[~total_anual["ano_completo"], "variacao_valor_pct"] = np.nan

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    base.to_csv(OUT_DIR / "dialise_mensal_brasil_por_grupo.csv", index=False, encoding="utf-8-sig")
    total_mensal.to_csv(OUT_DIR / "dialise_mensal_brasil_total.csv", index=False, encoding="utf-8-sig")
    total_anual.to_csv(OUT_DIR / "dialise_anual_brasil_total.csv", index=False, encoding="utf-8-sig")

    print("Base mensal por grupo:", base.shape)
    print("Total mensal:", total_mensal.shape)
    print("Total anual:", total_anual.shape)
    print(total_anual.to_string(index=False))


if __name__ == "__main__":
    main()

