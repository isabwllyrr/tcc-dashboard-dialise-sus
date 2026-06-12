from pathlib import Path

import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "dados_tratados"
FIG_DIR = ROOT_DIR / "graficos"

TOTAL_MENSAL = DATA_DIR / "dialise_mensal_brasil_total.csv"
POR_GRUPO = DATA_DIR / "dialise_mensal_brasil_por_grupo.csv"


def moeda(valor):
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def dataframe_to_markdown(df):
    cols = list(df.columns)
    lines = ["| " + " | ".join(cols) + " |", "| " + " | ".join(["---"] * len(cols)) + " |"]
    for _, row in df.iterrows():
        values = []
        for col in cols:
            value = row[col]
            if isinstance(value, float):
                values.append(f"{value:.2f}")
            else:
                values.append(str(value))
        lines.append("| " + " | ".join(values) + " |")
    return "\n".join(lines)


def main():
    FIG_DIR.mkdir(parents=True, exist_ok=True)

    mensal = pd.read_csv(TOTAL_MENSAL, parse_dates=["data"])
    grupo = pd.read_csv(POR_GRUPO, parse_dates=["data"])

    anual = (
        mensal.groupby("ano", as_index=False)
        .agg(valor_aprovado=("valor_aprovado", "sum"), qtd_aprovada=("qtd_aprovada", "sum"))
    )
    anual["custo_medio"] = anual["valor_aprovado"] / anual["qtd_aprovada"]
    anual["variacao_valor_pct"] = anual["valor_aprovado"].pct_change() * 100
    anual["variacao_qtd_pct"] = anual["qtd_aprovada"].pct_change() * 100
    meses_por_ano = mensal.groupby("ano")["mes"].nunique()
    anual["meses_disponiveis"] = anual["ano"].map(meses_por_ano).astype(int)
    anual["ano_completo"] = anual["meses_disponiveis"] == 12
    anual.loc[~anual["ano_completo"], ["variacao_valor_pct", "variacao_qtd_pct"]] = pd.NA
    anos_completos = meses_por_ano[meses_por_ano == 12].index
    ano_final_completo = int(anos_completos.max())

    grupo_total = (
        grupo.groupby("grupo_procedimento", as_index=False)
        .agg(valor_aprovado=("valor_aprovado", "sum"), qtd_aprovada=("qtd_aprovada", "sum"))
        .sort_values("valor_aprovado", ascending=False)
    )
    grupo_total["participacao_valor_pct"] = grupo_total["valor_aprovado"] / grupo_total["valor_aprovado"].sum() * 100
    grupo_total["custo_medio"] = grupo_total["valor_aprovado"] / grupo_total["qtd_aprovada"]

    resumo = {
        "periodo_inicio": mensal["data"].min().strftime("%Y-%m"),
        "periodo_fim": mensal["data"].max().strftime("%Y-%m"),
        "meses_analisados": int(mensal.shape[0]),
        "valor_total": float(mensal["valor_aprovado"].sum()),
        "qtd_total": float(mensal["qtd_aprovada"].sum()),
        "custo_medio_periodo": float(mensal["valor_aprovado"].sum() / mensal["qtd_aprovada"].sum()),
        "valor_2015": float(anual.loc[anual["ano"] == 2015, "valor_aprovado"].iloc[0]),
        "valor_final_completo": float(anual.loc[anual["ano"] == ano_final_completo, "valor_aprovado"].iloc[0]),
        "ano_final_completo": ano_final_completo,
    }
    resumo["crescimento_periodo_pct"] = (resumo["valor_final_completo"] / resumo["valor_2015"] - 1) * 100

    mensal.assign(
        media_movel_12m=mensal["valor_aprovado"].rolling(12).mean(),
        variacao_mensal_pct=mensal["valor_aprovado"].pct_change() * 100,
    ).to_csv(DATA_DIR / "serie_mensal_dashboard.csv", index=False, encoding="utf-8-sig")
    anual.to_csv(DATA_DIR / "indicadores_anuais_brasil.csv", index=False, encoding="utf-8-sig")
    grupo_total.to_csv(DATA_DIR / "indicadores_grupo_brasil.csv", index=False, encoding="utf-8-sig")

    anual_md = anual.copy()
    anual_md["valor_aprovado"] = anual_md["valor_aprovado"].map(moeda)
    anual_md["qtd_aprovada"] = anual_md["qtd_aprovada"].map(lambda x: f"{x:,.0f}".replace(",", "."))
    anual_md["custo_medio"] = anual_md["custo_medio"].map(moeda)
    anual_md["variacao_valor_pct"] = anual_md["variacao_valor_pct"].map(lambda x: "" if pd.isna(x) else f"{x:.2f}%")
    anual_md["variacao_qtd_pct"] = anual_md["variacao_qtd_pct"].map(lambda x: "" if pd.isna(x) else f"{x:.2f}%")

    grupo_md = grupo_total.copy()
    grupo_md["valor_aprovado"] = grupo_md["valor_aprovado"].map(moeda)
    grupo_md["qtd_aprovada"] = grupo_md["qtd_aprovada"].map(lambda x: f"{x:,.0f}".replace(",", "."))
    grupo_md["participacao_valor_pct"] = grupo_md["participacao_valor_pct"].map(lambda x: f"{x:.2f}%")
    grupo_md["custo_medio"] = grupo_md["custo_medio"].map(moeda)

    linhas = [
        "# Resultados exploratorios iniciais",
        "",
        f"Periodo analisado: {resumo['periodo_inicio']} a {resumo['periodo_fim']} ({resumo['meses_analisados']} meses).",
        f"Valor aprovado total: {moeda(resumo['valor_total'])}.",
        f"Quantidade aprovada total: {resumo['qtd_total']:,.0f}.".replace(",", "."),
        f"Custo medio no periodo: {moeda(resumo['custo_medio_periodo'])}.",
        f"Crescimento do valor aprovado entre 2015 e {resumo['ano_final_completo']} (ultimo ano fechado): {resumo['crescimento_periodo_pct']:.2f}%.",
        "O ano de 2026 aparece na base como periodo parcial e deve ser interpretado separadamente.",
        "",
        "## Valor aprovado anual",
        "",
        dataframe_to_markdown(anual_md),
        "",
        "## Participacao por grupo de procedimento",
        "",
        dataframe_to_markdown(grupo_md),
        "",
    ]
    (ROOT_DIR / "docs" / "resultados_exploratorios.md").write_text("\n".join(linhas), encoding="utf-8")

    print("Analise exploratoria gerada.")
    print(f"Valor total {resumo['periodo_inicio']} a {resumo['periodo_fim']}: {moeda(resumo['valor_total'])}")
    print(f"Crescimento 2015-{resumo['ano_final_completo']}: {resumo['crescimento_periodo_pct']:.2f}%")


if __name__ == "__main__":
    main()
