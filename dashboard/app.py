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


def classificar_risco_renal(pontos, egfr, albuminuria):
    if egfr < 30 or albuminuria >= 300 or pontos >= 9:
        return "Alto", "#b42318"
    if egfr < 60 or albuminuria >= 30 or pontos >= 5:
        return "Moderado", "#b54708"
    return "Baixo", "#027a48"


@st.cache_data
def carregar_dados():
    mensal = pd.read_csv(DATA_DIR / "dialise_mensal_brasil_total.csv", parse_dates=["data"])
    grupo = pd.read_csv(DATA_DIR / "dialise_mensal_brasil_por_grupo.csv", parse_dates=["data"])
    anual = pd.read_csv(DATA_DIR / "indicadores_anuais_brasil.csv")
    metricas = pd.read_csv(DATA_DIR / "metricas_modelos_preditivos.csv")
    previsao = pd.read_csv(DATA_DIR / "previsao_mensal_proximos_12m.csv", parse_dates=["data"])
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

aba_historico, aba_grupos, aba_previsao, aba_triagem, aba_dados = st.tabs([
    "Histórico",
    "Grupos",
    "Previsão",
    "Triagem de risco",
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
            title="Previsão mensal inicial para os próximos 12 meses",
        )
        st.plotly_chart(fig_prev, use_container_width=True)

with aba_triagem:
    st.subheader("Simulador educativo de risco renal")
    st.warning(
        "Esta tela é apenas educativa e não realiza diagnóstico. A avaliação de doença renal depende de consulta profissional e exames laboratoriais."
    )

    col_cli, col_lab = st.columns(2)
    with col_cli:
        st.markdown("**Dados clínicos e fatores de risco**")
        idade = st.number_input("Idade", min_value=0, max_value=120, value=45, step=1)
        diabetes = st.checkbox("Diabetes")
        hipertensao = st.checkbox("Hipertensão arterial")
        doenca_cardiovascular = st.checkbox("Doença cardiovascular")
        historico_familiar = st.checkbox("Histórico familiar de doença renal")
        obesidade = st.checkbox("Obesidade")
        tabagismo = st.checkbox("Tabagismo atual ou prévio importante")
        uso_antiinflamatorio = st.checkbox("Uso frequente de anti-inflamatórios sem acompanhamento")
        lesao_renal_aguda = st.checkbox("Histórico de lesão renal aguda")

    with col_lab:
        st.markdown("**Sintomas e exames**")
        inchaco = st.checkbox("Inchaço em pernas, pés ou rosto")
        urina_espumosa = st.checkbox("Urina muito espumosa")
        sangue_urina = st.checkbox("Sangue na urina")
        alteracao_urina = st.checkbox("Redução importante ou alteração persistente da urina")
        cansaco = st.checkbox("Cansaço persistente sem explicação")
        egfr = st.number_input("eGFR/TFG estimada (mL/min/1,73m²)", min_value=0.0, max_value=150.0, value=90.0, step=1.0)
        albuminuria = st.number_input("Albuminúria ou relação albumina/creatinina urinária (mg/g)", min_value=0.0, max_value=5000.0, value=10.0, step=5.0)

    pontos = 0
    fatores = []
    if idade >= 60:
        pontos += 1
        fatores.append("idade igual ou superior a 60 anos")
    for marcado, peso, nome in [
        (diabetes, 3, "diabetes"),
        (hipertensao, 3, "hipertensão arterial"),
        (doenca_cardiovascular, 2, "doença cardiovascular"),
        (historico_familiar, 2, "histórico familiar de doença renal"),
        (obesidade, 1, "obesidade"),
        (tabagismo, 1, "tabagismo"),
        (uso_antiinflamatorio, 1, "uso frequente de anti-inflamatórios"),
        (lesao_renal_aguda, 2, "histórico de lesão renal aguda"),
        (inchaco, 1, "inchaço"),
        (urina_espumosa, 1, "urina espumosa"),
        (sangue_urina, 2, "sangue na urina"),
        (alteracao_urina, 2, "alteração persistente da urina"),
        (cansaco, 1, "cansaço persistente"),
    ]:
        if marcado:
            pontos += peso
            fatores.append(nome)

    if egfr < 60:
        pontos += 4
        fatores.append("eGFR/TFG estimada abaixo de 60")
    elif egfr < 90:
        pontos += 1
        fatores.append("eGFR/TFG estimada entre 60 e 89")

    if albuminuria >= 300:
        pontos += 4
        fatores.append("albuminúria muito elevada")
    elif albuminuria >= 30:
        pontos += 3
        fatores.append("albuminúria elevada")

    risco, cor = classificar_risco_renal(pontos, egfr, albuminuria)
    st.markdown(
        f"<div style='border-left: 8px solid {cor}; padding: 1rem; background: #f8fafc;'>"
        f"<h3 style='margin-top: 0;'>Classificação simulada: {risco}</h3>"
        f"<p>Pontuação educativa: <strong>{pontos}</strong></p>"
        "</div>",
        unsafe_allow_html=True,
    )

    if risco == "Alto":
        st.error("Resultado de alerta: recomenda-se avaliação profissional e investigação laboratorial/nefrológica conforme contexto clínico.")
    elif risco == "Moderado":
        st.warning("Resultado intermediário: fatores de risco ou exames sugerem necessidade de acompanhamento e rastreio adequado.")
    else:
        st.success("Resultado baixo nesta simulação, sem excluir risco real. Pessoas com fatores de risco devem manter acompanhamento de rotina.")

    if fatores:
        st.markdown("**Fatores que mais contribuíram nesta simulação:**")
        st.write(", ".join(fatores))
    else:
        st.write("Nenhum fator de risco foi marcado nesta simulação.")

    st.caption(
        "Base conceitual: fatores de risco reconhecidos para doença renal crônica incluem diabetes, hipertensão, doença cardiovascular, histórico familiar e alterações em exames de sangue e urina."
    )

with aba_dados:
    st.subheader("Base mensal consolidada")
    st.dataframe(mensal_filtrado, use_container_width=True, hide_index=True)
    st.subheader("Base mensal por grupo")
    st.dataframe(grupo_filtrado, use_container_width=True, hide_index=True)
