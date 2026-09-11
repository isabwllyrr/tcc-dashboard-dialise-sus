from pathlib import Path

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dados_tratados"


def validar():
    mensal = pd.read_csv(DATA / "dialise_mensal_brasil_total.csv", parse_dates=["data"])
    grupos = pd.read_csv(DATA / "dialise_mensal_brasil_por_grupo.csv", parse_dates=["data"])
    grupos_resumo = pd.read_csv(DATA / "indicadores_grupo_brasil.csv")
    municipios = pd.read_csv(DATA / "indicadores_municipio_brasil.csv")
    metricas = pd.read_csv(DATA / "metricas_modelos_preditivos_corrigido.csv")
    previsao = pd.read_csv(DATA / "previsao_mensal_proximos_12m_corrigido.csv", parse_dates=["data"])

    esperado = pd.date_range(mensal["data"].min(), mensal["data"].max(), freq="MS")
    assert esperado.equals(pd.DatetimeIndex(mensal["data"])), "Serie mensal descontínua"
    assert not mensal["data"].duplicated().any(), "Meses duplicados"
    assert mensal[["valor_aprovado", "qtd_aprovada"]].notna().all().all(), "Nulos na serie"
    assert (mensal[["valor_aprovado", "qtd_aprovada"]] >= 0).all().all(), "Valores negativos"

    reconciliado = grupos.groupby("data")[["valor_aprovado", "qtd_aprovada"]].sum()
    total = mensal.set_index("data")[["valor_aprovado", "qtd_aprovada"]]
    assert np.allclose(total, reconciliado, rtol=0, atol=0.01), "Grupos nao fecham com total"
    assert not grupos["grupo_procedimento"].str.startswith("08 ").any(), "Transporte fora do escopo"
    assert not grupos_resumo["grupo_procedimento"].str.startswith("08 ").any(), "Resumo de grupos fora do escopo"

    assert municipios["periodo_analise"].eq("2015_2025").all(), "Territorio inclui ano parcial"
    assert not municipios["cod_municipio"].duplicated().any(), "Municipios duplicados"
    assert np.isclose(municipios["participacao_valor_nacional_pct"].sum(), 100), "Participacoes invalidas"

    assert len(previsao) == 12 and not previsao["data"].duplicated().any(), "Previsao deve ter 12 meses"
    assert (previsao["limite_inferior_95"] <= previsao["previsao_valor_aprovado"]).all()
    assert (previsao["previsao_valor_aprovado"] <= previsao["limite_superior_95"]).all()
    assert metricas["MAPE_desvio_pct"].notna().all(), "Desvio do MAPE ausente"
    assert metricas["recortes"].eq(43).all(), "Quantidade inesperada de janelas"
    assert metricas.iloc[0]["modelo"] == previsao.iloc[0]["modelo_usado"], "Modelo divergente"

    return {
        "meses": len(mensal),
        "periodo": f"{mensal['data'].min():%Y-%m} a {mensal['data'].max():%Y-%m}",
        "municipios": len(municipios),
        "modelo": metricas.iloc[0]["modelo"],
        "mape_12m": metricas.iloc[0]["MAPE_pct"],
    }


if __name__ == "__main__":
    resultado = validar()
    print("Validacao concluida sem erros")
    for chave, valor in resultado.items():
        print(f"- {chave}: {valor}")
