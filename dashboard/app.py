from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "dados_tratados"

st.set_page_config(
    page_title="Custos da dialise no SUS",
    page_icon="📊",
    layout="wide",
)


def moeda(valor):
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


@st.cache_data
def carregar_dados():
    mensal = pd.read_csv(DATA_DIR / "dialise_mensal_brasil_total.csv", parse_dates=["data"])
    grupo = pd.read_csv(DATA_DIR / "dialise_mensal_brasil_por_grupo.csv", parse_dates=["data"])
    anual = pd.read_csv(DATA_DIR / "indicadores_anuais_brasil.csv")
    metricas = pd.read_csv(DATA_DIR / "metricas_modelos_preditivos.csv")
    previsao = pd.read_csv(DATA_DIR / "previsao_mensal_2024.csv", parse_dates=["data"])
    comparacao = pd.read_csv(DATA_DIR / "comparacao_real_previsto_2022_2023.csv", parse_dates=["data"])
    return mensal, grupo, anual, metricas, previsao, comparacao


mensal, grupo, anual, metricas, previsao, comparacao = carregar_dados()

st.title("Análise preditiva e monitoramento de custos da diálise no SUS")
st.caption("Brasil | SIA/SUS - DATASUS | Procedimentos selecionados de diálise | 2015 a 2023")

anos = sorted(mensal["ano"].unique())
ano_min, ano_max = st.sidebar.slider(
    "Período",
    min_value=int(min(anos)),
    max_value=int(max(anos)),
    value=(int(min(anos)), int(max(anos))),
)

grupo_opcoes = ["Todos"] + sorted(grupo["grupo_procedimento"].unique().tolist())
grupo_escolhido = st.sidebar.selectbox("Grupo de procedimento", grupo_opcoes)

mensal_filtrado = mensal[(mensal["ano"] >= ano_min) & (mensal["ano"] <= ano_max)].copy()
grupo_filtrado = grupo[(grupo["ano"] >= ano_min) & (grupo["ano"] <= ano_max)].copy()
if grupo_escolhido != "Todos":
    grupo_filtrado = grupo_filtrado[grupo_filtrado["grupo_procedimento"] == grupo_escolhido]
    mensal_filtrado = (
        grupo_filtrado.groupby(["data", "ano", "mes"], as_index=False)
        .agg(valor_aprovado=("valor_aprovado", "sum"), qtd_aprovada=("qtd_aprovada", "sum"))
    )
    mensal_filtrado["custo_medio"] = mensal_filtrado["valor_aprovado"] / mensal_filtrado["qtd_aprovada"]

valor_total = mensal_filtrado["valor_aprovado"].sum()
qtd_total = mensal_filtrado["qtd_aprovada"].sum()
custo_medio = valor_total / qtd_total if qtd_total else 0
valor_primeiro_ano = mensal_filtrado.loc[mensal_filtrado["ano"] == ano_min, "valor_aprovado"].sum()
valor_ultimo_ano = mensal_filtrado.loc[mensal_filtrado["ano"] == ano_max, "valor_aprovado"].sum()
variacao_periodo = (valor_ultimo_ano / valor_primeiro_ano - 1) * 100 if valor_primeiro_ano else 0

col1, col2, col3, col4 = st.columns(4)
col1.metric("Valor aprovado", moeda(valor_total))
col2.metric("Quantidade aprovada", f"{qtd_total:,.0f}".replace(",", "."))
col3.metric("Custo médio", moeda(custo_medio))
col4.metric("Variação no período", f"{variacao_periodo:.2f}%")

aba_historico, aba_grupos, aba_previsao, aba_dados = st.tabs([
    "Histórico",
    "Grupos",
    "Previsão",
    "Dados",
])

with aba_historico:
    fig_valor = px.line(
        mensal_filtrado,
        x="data",
        y="valor_aprovado",
        markers=True,
        labels={"data": "Data", "valor_aprovado": "Valor aprovado (R$)"},
        title="Evolução mensal do valor aprovado",
    )
    st.plotly_chart(fig_valor, use_container_width=True)

    col_a, col_b = st.columns(2)
    with col_a:
        fig_qtd = px.line(
            mensal_filtrado,
            x="data",
            y="qtd_aprovada",
            markers=True,
            labels={"data": "Data", "qtd_aprovada": "Quantidade aprovada"},
            title="Quantidade aprovada mensal",
        )
        st.plotly_chart(fig_qtd, use_container_width=True)
    with col_b:
        fig_custo = px.line(
            mensal_filtrado,
            x="data",
            y="custo_medio",
            markers=True,
            labels={"data": "Data", "custo_medio": "Custo médio (R$)"},
            title="Custo médio mensal",
        )
        st.plotly_chart(fig_custo, use_container_width=True)

with aba_grupos:
    grupo_resumo = (
        grupo_filtrado.groupby("grupo_procedimento", as_index=False)
        .agg(valor_aprovado=("valor_aprovado", "sum"), qtd_aprovada=("qtd_aprovada", "sum"))
    )
    grupo_resumo["custo_medio"] = grupo_resumo["valor_aprovado"] / grupo_resumo["qtd_aprovada"]
    grupo_resumo["participacao_valor_pct"] = grupo_resumo["valor_aprovado"] / grupo_resumo["valor_aprovado"].sum() * 100

    fig_grupo = px.bar(
        grupo_resumo.sort_values("valor_aprovado", ascending=False),
        x="grupo_procedimento",
        y="valor_aprovado",
        labels={"grupo_procedimento": "Grupo", "valor_aprovado": "Valor aprovado (R$)"},
        title="Valor aprovado por grupo de procedimento",
    )
    st.plotly_chart(fig_grupo, use_container_width=True)
    st.dataframe(grupo_resumo, use_container_width=True, hide_index=True)

with aba_previsao:
    st.subheader("Comparação entre valor real e modelos no teste")
    comparacao_long = comparacao.melt(
        id_vars=["data", "valor_aprovado"],
        value_vars=["media_movel_12m", "sazonal_ingenuo_12m", "tendencia_linear"],
        var_name="modelo",
        value_name="previsao",
    )
    real = comparacao[["data", "valor_aprovado"]].rename(columns={"valor_aprovado": "valor"})
    real["serie"] = "real"
    pred = comparacao_long.rename(columns={"previsao": "valor", "modelo": "serie"})[["data", "valor", "serie"]]
    fig_comp = px.line(
        pd.concat([real, pred], ignore_index=True),
        x="data",
        y="valor",
        color="serie",
        labels={"data": "Data", "valor": "Valor aprovado (R$)", "serie": "Série"},
        title="Real x previsto - 2022 e 2023",
    )
    st.plotly_chart(fig_comp, use_container_width=True)

    col_m, col_p = st.columns([1, 2])
    with col_m:
        st.dataframe(metricas, use_container_width=True, hide_index=True)
    with col_p:
        fig_prev = px.line(
            previsao,
            x="data",
            y="previsao_valor_aprovado",
            markers=True,
            labels={"data": "Data", "previsao_valor_aprovado": "Previsão (R$)"},
            title="Previsão mensal inicial para 2024",
        )
        st.plotly_chart(fig_prev, use_container_width=True)

with aba_dados:
    st.subheader("Base mensal consolidada")
    st.dataframe(mensal_filtrado, use_container_width=True, hide_index=True)
    st.subheader("Base mensal por grupo")
    st.dataframe(grupo_filtrado, use_container_width=True, hide_index=True)
