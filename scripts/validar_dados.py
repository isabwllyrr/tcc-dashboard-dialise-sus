import json
from pathlib import Path

import numpy as np
import pandas as pd
from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dados_tratados"
DOSSIE = ROOT / "dossie"

# Constants for backtest window derivation
HORIZON = 12
FIRST_BACKTEST = pd.Timestamp("2022-01-01")
OFFICIAL_MODEL = "gradient_boosting"
EVIDENCE_TARGETS = {"valor_aprovado", "valor_aprovado_real"}

# Onda 0.1 (docs/tarefas/aferidor-onda0-1.md, docs/PLANO-V3-CONCEITO-C.md §3.2):
# os cinco estados permitidos de uma celula municipio x ano / grupo x mes.
# "estimado" e saida de modelo/interpolacao (previsao 12m, populacao 2023) e
# nao ocorre nestas tabelas de procedimentos aprovados — permitido no
# conjunto, mas nao exigido presente.
ESTADOS_VALIDOS = {"observado", "provisorio", "estimado", "sem_registro", "ausente"}
ESTADOS_SEM_NUMERO_CONFIAVEL = {"sem_registro", "ausente"}


def validar():
    mensal = pd.read_csv(DATA / "dialise_mensal_brasil_total.csv", parse_dates=["data"])
    grupos = pd.read_csv(DATA / "dialise_mensal_brasil_por_grupo.csv", parse_dates=["data"])
    grupos_resumo = pd.read_csv(DATA / "indicadores_grupo_brasil.csv")
    municipios = pd.read_csv(DATA / "indicadores_municipio_brasil.csv")
    municipios_long = pd.read_csv(DATA / "municipio_dialise_brasil_long.csv")
    populacao = pd.read_csv(DATA / "populacao_municipio_2015_2025.csv")
    ipca = pd.read_csv(DATA / "ipca_mensal_2015_2026_06.csv", parse_dates=["data"])
    metricas = pd.read_csv(DATA / "metricas_modelos_preditivos_corrigido.csv")
    previsao = pd.read_csv(DATA / "previsao_mensal_proximos_12m_corrigido.csv", parse_dates=["data"])
    backtest_operacional = pd.read_csv(DATA / "backtest_horizonte_12m_detalhado.csv")
    evidencia_resumo = pd.read_csv(DATA / "evidencia_modelos_resumo.csv")
    evidencia_janelas = pd.read_csv(DATA / "evidencia_modelos_janelas.csv")
    evidencia_detalhes = pd.read_csv(DATA / "evidencia_modelos_detalhado.csv")
    evidencia_horizonte = pd.read_csv(DATA / "evidencia_modelos_horizonte.csv")
    nacional_anual = pd.read_csv(DATA / "dialise_anual_brasil_total.csv")
    uf_anual = pd.read_csv(DATA / "dialise_uf_total_anual.csv")
    distribuicao_trajetorias = pd.read_csv(DATA / "distribuicao_trajetorias_municipais.csv")

    esperado = pd.date_range(mensal["data"].min(), mensal["data"].max(), freq="MS")
    assert esperado.equals(pd.DatetimeIndex(mensal["data"])), "Serie mensal descontínua"
    assert not mensal["data"].duplicated().any(), "Meses duplicados"
    assert mensal[["valor_aprovado", "qtd_aprovada"]].notna().all().all(), "Nulos na serie"
    assert (mensal[["valor_aprovado", "qtd_aprovada"]] >= 0).all().all(), "Valores negativos"
    colunas_reais = ["ipca_indice", "fator_correcao_jun_2026", "valor_aprovado_real", "custo_medio_real"]
    assert mensal[colunas_reais].notna().all().all(), "IPCA ou valores reais ausentes"
    assert np.isclose(mensal.iloc[-1]["fator_correcao_jun_2026"], 1), "Mes-base do IPCA invalido"
    assert np.allclose(
        mensal["valor_aprovado_real"],
        mensal["valor_aprovado"] * mensal["fator_correcao_jun_2026"],
    ), "Correcao monetaria mensal inconsistente"

    assert len(ipca) == len(mensal), "IPCA nao cobre toda a serie mensal"
    assert ipca["data"].equals(mensal["data"]), "Datas do IPCA e da serie nao coincidem"
    assert not populacao.duplicated(["cod_ibge", "ano"]).any(), "Populacao duplicada"
    assert set(populacao["ano"].unique()) == set(range(2015, 2026)), "Anos populacionais incompletos"
    interpolada = populacao[populacao["ano"] == 2023]
    assert len(interpolada) == populacao[populacao["ano"] == 2022]["cod_ibge"].nunique(), "Interpolacao 2023 incompleta"
    assert interpolada["fonte_populacao"].str.contains("Interpolacao geometrica").all(), "Fonte de 2023 invalida"

    reconciliado = grupos.groupby("data")[["valor_aprovado", "qtd_aprovada"]].sum()
    total = mensal.set_index("data")[["valor_aprovado", "qtd_aprovada"]]
    assert np.allclose(total, reconciliado, rtol=0, atol=0.01), "Grupos nao fecham com total"
    assert not grupos["grupo_procedimento"].str.startswith("08 ").any(), "Transporte fora do escopo"
    assert not grupos_resumo["grupo_procedimento"].str.startswith("08 ").any(), "Resumo de grupos fora do escopo"

    assert municipios["periodo_analise"].eq("2015_2025").all(), "Territorio inclui ano parcial"
    assert not municipios["cod_municipio"].duplicated().any(), "Municipios duplicados"
    # participacao_*_nacional_pct soma 100 sobre quem tem valor/qtd conhecido;
    # municipios com o periodo inteiro sem_registro ficam de fora da soma
    # (NaN), entao a soma dos que restam ainda fecha em 100.
    assert np.isclose(municipios["participacao_valor_nacional_pct"].sum(), 100), "Participacoes invalidas"

    # Onda 0.1: indicadores derivados de populacao (sempre conhecida pelo
    # IBGE, independente de ter havido procedimento) sao exigidos em 100%
    # dos municipios. Indicadores derivados de valor_aprovado/qtd_aprovada
    # so podem ser nulos onde nao ha nenhum ano com numero real no periodo
    # relevante (sem_registro/ausente no periodo inteiro) — nunca em outro
    # caso. Antes desta correcao, um fillna(0) escondia essa distincao.
    indicadores_populacao = ["populacao_2025", "populacao_uf_acumulada_2015_2025"]
    assert municipios[indicadores_populacao].notna().all().all(), \
        "Indicadores populacionais territoriais ausentes"

    # Indicadores do periodo inteiro (2015-2025): so podem ser NaN quando
    # NENHUM ano do periodo tem numero real (valor_periodo NaN).
    sem_registro_periodo_inteiro = municipios["valor_periodo"].isna()
    indicadores_de_periodo = ["valor_real_periodo", "valor_real_por_habitante_ano", "qtd_por_100_mil_ano"]
    com_periodo_conhecido = municipios.loc[~sem_registro_periodo_inteiro, indicadores_de_periodo]
    assert com_periodo_conhecido.notna().all().all(), \
        "Indicador de periodo ausente em municipio com ao menos um ano conhecido"
    sem_periodo_conhecido = municipios.loc[sem_registro_periodo_inteiro, "valor_real_periodo"]
    assert sem_periodo_conhecido.isna().all(), \
        "Municipio sem nenhum ano de registro no periodo tem valor_real_periodo != NaN (zero fabricado)"

    # Indicadores especificos de 2025: so podem ser NaN quando o proprio ano
    # de 2025 for sem_registro/ausente para aquele municipio — mesmo que o
    # periodo inteiro tenha outros anos com numero (ex.: PARNAMIRIM).
    ano_2025_sem_numero = municipios["estado_2025"].isin(ESTADOS_SEM_NUMERO_CONFIAVEL)
    indicadores_2025 = ["qtd_por_100_mil_2025", "valor_real_por_habitante_2025"]
    com_2025_conhecido = municipios.loc[~ano_2025_sem_numero, indicadores_2025]
    assert com_2025_conhecido.notna().all().all(), \
        "Indicador 2025 ausente em municipio com 2025 observado/provisorio"
    sem_2025_conhecido = municipios.loc[ano_2025_sem_numero, indicadores_2025]
    assert sem_2025_conhecido.isna().all().all(), \
        "Indicador 2025 preenchido em municipio sem_registro/ausente em 2025 (zero fabricado)"

    recorte_long = municipios_long[municipios_long["ano"].between(2015, 2025)]
    assert recorte_long["populacao"].notna().all(), "Municipio-ano sem populacao"
    assert recorte_long["fator_correcao_jun_2026"].notna().all(), "Municipio-ano sem IPCA"

    # --- Onda 0.1 (docs/tarefas/aferidor-onda0-1.md, PLANO-V3-CONCEITO-C.md §3.4) ---
    # estado_registro existe e so contem os cinco valores do §3.2.
    assert "estado_registro" in municipios_long.columns, "Coluna estado_registro ausente"
    assert set(municipios_long["estado_registro"].dropna().unique()) <= ESTADOS_VALIDOS, \
        "estado_registro contem valor fora dos cinco estados"
    assert "estado_registro_2025" in municipios.columns, "estado_registro_2025 nao chegou ao indicador municipal"
    assert set(municipios["estado_registro_2025"].dropna().unique()) <= ESTADOS_VALIDOS, \
        "estado_registro_2025 contem valor fora dos cinco estados"

    # Nenhuma linha sem_registro tem qtd_aprovada/valor_aprovado gravado como
    # observacao de zero: precisa estar NaN, nunca 0.
    linhas_sem_registro = municipios_long[municipios_long["estado_registro"] == "sem_registro"]
    assert linhas_sem_registro["qtd_aprovada"].isna().all(), \
        "Linha sem_registro tem qtd_aprovada gravada (nao e NaN) — zero fabricado"
    assert linhas_sem_registro["valor_aprovado"].isna().all(), \
        "Linha sem_registro tem valor_aprovado gravado (nao e NaN) — zero fabricado"

    # Nenhuma variacao percentual foi calculada sobre par com sem_registro ou
    # ausente sem reportar exclusao: cruza anos_excluidos_* (calculado no
    # tratamento) com a contagem real de estado_{ano} nao observado/nao
    # provisorio para o mesmo periodo, coluna a coluna.
    anos_pre = [str(a) for a in range(2015, 2020)]
    anos_pos = [str(a) for a in range(2022, 2026)]
    estado_cols_pre = [f"estado_{a}" for a in anos_pre]
    estado_cols_pos = [f"estado_{a}" for a in anos_pos]
    assert all(c in municipios.columns for c in estado_cols_pre + estado_cols_pos), \
        "Colunas estado_<ano> ausentes em indicadores_municipio_brasil.csv"
    excluidos_pre_medido = municipios[estado_cols_pre].isin(list(ESTADOS_SEM_NUMERO_CONFIAVEL)).sum(axis=1)
    excluidos_pos_medido = municipios[estado_cols_pos].isin(list(ESTADOS_SEM_NUMERO_CONFIAVEL)).sum(axis=1)
    excluidos_crescimento_medido = excluidos_pre_medido + excluidos_pos_medido
    assert (municipios["anos_excluidos_crescimento"] == excluidos_crescimento_medido).all(), \
        "anos_excluidos_crescimento nao bate com a contagem real de sem_registro/ausente no periodo"
    # Se TODOS os anos de um dos dois sub-periodos (pre ou pos) forem
    # sem_registro/ausente, a media daquele sub-periodo — e portanto o
    # crescimento — tem que ser NaN, nunca um numero calculado como se o
    # sub-periodo inteiro valesse zero.
    pre_totalmente_excluido = excluidos_pre_medido == len(anos_pre)
    pos_totalmente_excluido = excluidos_pos_medido == len(anos_pos)
    algum_subperiodo_vazio = pre_totalmente_excluido | pos_totalmente_excluido
    assert municipios.loc[algum_subperiodo_vazio, "crescimento_valor_pos_vs_pre_pct"].isna().all(), \
        "crescimento_valor_pos_vs_pre_pct calculado com um sub-periodo inteiramente sem_registro/ausente"
    assert municipios.loc[algum_subperiodo_vazio, "crescimento_qtd_pos_vs_pre_pct"].isna().all(), \
        "crescimento_qtd_pos_vs_pre_pct calculado com um sub-periodo inteiramente sem_registro/ausente"

    # A lacuna historica da Onda 0.1 fica encerrada nas secoes 17 e 18:
    # o estado e a procedencia dos denominadores sao exigidos pelo schema,
    # e os valores compartilhados entre dossie e CSVs sao cruzados abaixo.

    # --- 17. Onda 1.2: agregacao territorial e trajetorias 2015-2025 ---
    colunas_uf_esperadas = [
        "uf", "ano", "qtd_aprovada", "valor_aprovado_nominal",
        "valor_aprovado_real", "populacao", "taxa_qtd_100k",
        "valor_real_per_capita",
    ]
    assert list(uf_anual.columns) == colunas_uf_esperadas, \
        "Contrato de colunas do agregado anual por UF divergiu"
    assert len(uf_anual) == 27 * 11, "Agregado por UF deve ter 27 UFs x 11 anos"
    assert uf_anual["uf"].nunique() == 27, "Agregado por UF nao contem 27 UFs"
    assert set(uf_anual["ano"]) == set(range(2015, 2026)), \
        "Agregado por UF deve se limitar a 2015-2025"
    assert not uf_anual.duplicated(["uf", "ano"]).any(), "UF-ano duplicado"
    assert uf_anual.groupby("ano")["uf"].nunique().eq(27).all(), \
        "Algum ano do agregado nao contem as 27 UFs"

    uf_reconciliado = (
        uf_anual.groupby("ano", as_index=False)
        .agg(qtd_uf=("qtd_aprovada", "sum"), valor_uf=("valor_aprovado_nominal", "sum"))
        .merge(
            nacional_anual[["ano", "qtd_aprovada", "valor_aprovado"]],
            on="ano", how="inner", validate="one_to_one",
        )
    )
    assert len(uf_reconciliado) == 11, "Reconciliacao UF-nacional incompleta"
    assert np.allclose(uf_reconciliado["qtd_uf"], uf_reconciliado["qtd_aprovada"], rtol=0, atol=0), \
        "Soma das 27 UFs nao fecha 100% com a quantidade nacional"
    assert np.allclose(uf_reconciliado["valor_uf"], uf_reconciliado["valor_aprovado"], rtol=0, atol=0.01), \
        "Soma das 27 UFs nao fecha 100% com o valor nominal nacional"
    assert np.allclose(
        uf_anual["taxa_qtd_100k"],
        uf_anual["qtd_aprovada"] / uf_anual["populacao"] * 100_000,
    ), "Taxa estadual por 100 mil inconsistente"
    assert np.allclose(
        uf_anual["valor_real_per_capita"],
        uf_anual["valor_aprovado_real"] / uf_anual["populacao"],
    ), "Valor real estadual per capita inconsistente"

    faixas_trajetoria = distribuicao_trajetorias[
        distribuicao_trajetorias["registro_tipo"] == "faixa_variacao"
    ]
    exclusoes_trajetoria = distribuicao_trajetorias[
        distribuicao_trajetorias["registro_tipo"] == "exclusao"
    ]
    resumo_exclusao = distribuicao_trajetorias[
        distribuicao_trajetorias["registro_tipo"] == "resumo_exclusao"
    ]
    assert len(faixas_trajetoria) == 7, "Distribuicao deve conter sete faixas de variacao"
    assert len(resumo_exclusao) == 1, "Distribuicao deve reportar um total de excluidos"
    assert faixas_trajetoria["incluido_na_distribuicao"].all(), \
        "Faixa de variacao marcada como excluida"
    assert (~exclusoes_trajetoria["incluido_na_distribuicao"]).all(), \
        "Exclusao marcada como elegivel para variacao"
    assert exclusoes_trajetoria["motivo_exclusao"].notna().all(), \
        "Exclusao sem justificativa explicita"

    extremos = municipios_long[municipios_long["ano"].isin([2015, 2025])].pivot(
        index="cod_ibge", columns="ano", values=["estado_registro", "valor_aprovado_real"]
    )
    estado_inicio = extremos[("estado_registro", 2015)].fillna("ausente")
    estado_fim = extremos[("estado_registro", 2025)].fillna("ausente")
    valor_inicio = pd.to_numeric(extremos[("valor_aprovado_real", 2015)], errors="coerce")
    elegiveis = (
        ~estado_inicio.isin(ESTADOS_SEM_NUMERO_CONFIAVEL)
        & ~estado_fim.isin(ESTADOS_SEM_NUMERO_CONFIAVEL)
        & valor_inicio.notna()
        & valor_inicio.ne(0)
    )
    total_comparaveis = int(faixas_trajetoria["municipios"].sum())
    total_excluidos = int(resumo_exclusao.iloc[0]["municipios"])
    assert total_comparaveis == int(elegiveis.sum()), \
        "Numero de trajetorias comparaveis diverge dos estados nos extremos"
    assert total_excluidos == int((~elegiveis).sum()), \
        "Numero reportado de excluidos diverge dos estados nos extremos"
    assert int(exclusoes_trajetoria["municipios"].sum()) == total_excluidos, \
        "Detalhamento das exclusoes nao fecha com o total reportado"
    assert total_comparaveis + total_excluidos == len(extremos), \
        "Trajetorias e exclusoes nao cobrem toda a coorte municipal"

    # --- 18. Onda 2.1: schema, completude e concordancia dossie-CSV ---
    schema_path = DOSSIE / "schema.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    schema_validator = Draft202012Validator(schema, format_checker=FormatChecker())
    documentos_paths = sorted(path for path in DOSSIE.rglob("*.json") if path != schema_path)
    assert len(documentos_paths) == 34, "Dossie deve conter exatamente 34 documentos canonicos"
    documentos = [json.loads(path.read_text(encoding="utf-8")) for path in documentos_paths]
    erros_schema = [
        f"{path.relative_to(ROOT)}: {erro.message}"
        for path, documento in zip(documentos_paths, documentos)
        for erro in schema_validator.iter_errors(documento)
    ]
    assert not erros_schema, "Dossie invalido no Draft 2020-12: " + " | ".join(erros_schema[:5])
    tipos = pd.Series([documento["tipo_documento"] for documento in documentos]).value_counts().to_dict()
    tipos_esperados = {
        "manifesto": 1, "nacional": 1, "modelo": 1,
        "territorio_indice": 1, "territorio_distribuicao": 1,
        "territorio_uf": 27, "glossario": 1, "ressalvas": 1,
    }
    assert tipos == tipos_esperados, f"Tipos canonicos incompletos: {tipos}"

    nacional_doc = next(doc for doc in documentos if doc["tipo_documento"] == "nacional")
    g1 = pd.DataFrame([
        {"ano": int(ponto_dossie["periodo"]), "serie": ponto_dossie["serie"], "valor": ponto_dossie["valor"]}
        for ponto_dossie in nacional_doc["series"]["g1_valor_anual"]
    ])
    g1_nominal = g1[g1["serie"] == "nominal"].sort_values("ano")
    nacional_completo = nacional_anual[nacional_anual["ano"].between(2015, 2025)].sort_values("ano")
    assert np.array_equal(g1_nominal["ano"].to_numpy(), nacional_completo["ano"].to_numpy()), \
        "Anos nacionais do dossie divergem do CSV anual"
    assert np.allclose(g1_nominal["valor"], nacional_completo["valor_aprovado"], rtol=0, atol=0.01), \
        "Serie nominal nacional do dossie diverge do CSV anual"

    indice_doc = next(doc for doc in documentos if doc["tipo_documento"] == "territorio_indice")
    mapa_dossie = pd.DataFrame([
        {
            "uf": item["uf"], "ano": int(item["periodo"]),
            "qtd_dossie": item["quantidade"]["valor"],
            "taxa_dossie": item["taxa_100_mil"]["valor"],
            "populacao_dossie": item["taxa_100_mil"]["denominador"]["valor"],
        }
        for item in indice_doc["mapa_por_ano"]
    ])
    mapa_conferido = mapa_dossie.merge(uf_anual, on=["uf", "ano"], how="inner", validate="one_to_one")
    assert len(mapa_conferido) == len(uf_anual), "Mapa do dossie nao cobre todos os UF-ano"
    for coluna_dossie, coluna_csv in [
        ("qtd_dossie", "qtd_aprovada"),
        ("taxa_dossie", "taxa_qtd_100k"),
        ("populacao_dossie", "populacao"),
    ]:
        assert np.allclose(mapa_conferido[coluna_dossie], mapa_conferido[coluna_csv]), \
            f"{coluna_dossie} do dossie diverge do agregado por UF"

    docs_uf = [doc for doc in documentos if doc["tipo_documento"] == "territorio_uf"]
    assert {doc["uf"]["sigla"] for doc in docs_uf} == set(uf_anual["uf"]), \
        "Arquivos territoriais nao correspondem as 27 UFs do agregado"
    linhas_municipais_dossie = sum(len(doc["municipios_por_ano"]) for doc in docs_uf)
    assert linhas_municipais_dossie == len(municipios_long[municipios_long["ano"].between(2015, 2025)]), \
        "Arquivos territoriais nao cobrem todas as linhas municipio-ano de 2015-2025"

    distribuicao_doc = next(doc for doc in documentos if doc["tipo_documento"] == "territorio_distribuicao")
    total_trajetorias_dossie = sum(item["municipios"]["valor"] for item in distribuicao_doc["trajetorias"])
    assert total_trajetorias_dossie == len(extremos), \
        "Categorias territoriais do dossie nao cobrem toda a coorte"
    modelo_doc = next(doc for doc in documentos if doc["tipo_documento"] == "modelo")
    assert len(modelo_doc["comparacao_modelos"]) == len(evidencia_resumo), \
        "Comparacao de modelos do dossie diverge da evidencia tabular"

    assert len(previsao) == 12 and not previsao["data"].duplicated().any(), "Previsao deve ter 12 meses"
    assert (previsao["limite_inferior_95"] <= previsao["previsao_valor_aprovado"]).all()
    assert (previsao["previsao_valor_aprovado"] <= previsao["limite_superior_95"]).all()
    assert metricas["MAPE_desvio_pct"].notna().all(), "Desvio do MAPE ausente"
    ultimo_inicio = mensal["data"].max() - pd.DateOffset(months=HORIZON - 1)
    n_janelas_esperado = len(pd.date_range(FIRST_BACKTEST, ultimo_inicio, freq="MS"))
    assert metricas["recortes"].eq(n_janelas_esperado).all(), \
        f"Quantidade inesperada de janelas: {metricas['recortes'].unique()} vs esperado {n_janelas_esperado}"
    assert metricas.iloc[0]["modelo"] == previsao.iloc[0]["modelo_usado"], "Modelo divergente"
    assert previsao["modelo_usado"].eq(OFFICIAL_MODEL).all(), \
        "Modelo oficial mudou sem gate academico"

    # --- 16. Evidencia comparativa: Holt-Winters, dois alvos e horizonte ---
    modelos_evidencia = set(metricas["modelo"]) | {"holt_winters"}
    assert set(evidencia_resumo["alvo"]) == EVIDENCE_TARGETS, \
        "A evidencia deve cobrir os alvos nominal e real"
    assert set(evidencia_resumo["modelo"]) == modelos_evidencia, \
        "Conjunto inesperado de modelos na evidencia"
    assert evidencia_resumo["recortes"].eq(n_janelas_esperado).all(), \
        "Quantidade de janelas divergente na evidencia"
    assert len(backtest_operacional) == len(metricas) * n_janelas_esperado * HORIZON, \
        "Detalhe operacional nao fecha com modelos, janelas e horizontes"
    assert len(evidencia_detalhes) == (
        len(EVIDENCE_TARGETS) * len(modelos_evidencia) * n_janelas_esperado * HORIZON
    ), "Detalhe da evidencia nao fecha com alvos, modelos, janelas e horizontes"
    assert len(evidencia_janelas) == (
        len(EVIDENCE_TARGETS) * len(modelos_evidencia) * n_janelas_esperado
    ), "Janelas da evidencia incompletas"
    assert set(evidencia_horizonte["horizonte"]) == set(range(1, HORIZON + 1)), \
        "Horizontes incompletos na evidencia"
    assert evidencia_horizonte["observacoes"].eq(n_janelas_esperado).all(), \
        "Numero inesperado de observacoes por horizonte"
    assert evidencia_resumo[["MAPE_pct", "MAPE_mediana_pct", "MASE"]].gt(0).all().all(), \
        "Metricas de erro invalidas na evidencia"

    chaves_resumo = ["alvo", "escala", "modelo", "tipo"]
    resumo_recalculado = (
        evidencia_janelas.groupby(chaves_resumo, as_index=False)
        .agg(
            MAPE_pct_recalculado=("MAPE_pct", "mean"),
            MAPE_mediana_pct_recalculado=("MAPE_pct", "median"),
            MASE_recalculado=("MASE", "mean"),
            vies_pct_recalculado=("vies_pct", "mean"),
            recortes_recalculado=("inicio_teste", "nunique"),
            ajustes_nao_convergentes_recalculado=(
                "convergiu", lambda values: int((~values).sum())
            ),
        )
    )
    resumo_conferido = evidencia_resumo.merge(
        resumo_recalculado, on=chaves_resumo, how="inner", validate="one_to_one"
    )
    assert len(resumo_conferido) == len(evidencia_resumo), "Resumo sem origem nas janelas"
    for coluna in ["MAPE_pct", "MAPE_mediana_pct", "MASE", "vies_pct"]:
        assert np.allclose(
            resumo_conferido[coluna], resumo_conferido[f"{coluna}_recalculado"]
        ), f"{coluna} divergente entre resumo e janelas"
    assert (
        resumo_conferido["recortes"] == resumo_conferido["recortes_recalculado"]
    ).all(), "Recortes divergentes entre resumo e janelas"
    assert (
        resumo_conferido["ajustes_nao_convergentes"]
        == resumo_conferido["ajustes_nao_convergentes_recalculado"]
    ).all(), "Convergencia divergente entre resumo e janelas"

    chaves_horizonte = ["alvo", "escala", "modelo", "tipo", "horizonte"]
    horizonte_recalculado = (
        evidencia_detalhes.groupby(chaves_horizonte, as_index=False)
        .agg(
            observacoes_recalculado=("data", "size"),
            MAE_recalculado=("residuo", lambda values: np.mean(np.abs(values))),
            RMSE_recalculado=("residuo", lambda values: np.sqrt(np.mean(values**2))),
            MAPE_pct_recalculado=("erro_absoluto_pct", "mean"),
            vies_pct_recalculado=("erro_pct", "mean"),
        )
    )
    horizonte_conferido = evidencia_horizonte.merge(
        horizonte_recalculado,
        on=chaves_horizonte,
        how="inner",
        validate="one_to_one",
    )
    assert len(horizonte_conferido) == len(evidencia_horizonte), \
        "Horizonte sem origem nos detalhes"
    for coluna in ["MAE", "RMSE", "MAPE_pct", "vies_pct"]:
        assert np.allclose(
            horizonte_conferido[coluna], horizonte_conferido[f"{coluna}_recalculado"]
        ), f"{coluna} divergente entre horizonte e detalhes"
    assert (
        horizonte_conferido["observacoes"]
        == horizonte_conferido["observacoes_recalculado"]
    ).all(), "Observacoes divergentes entre horizonte e detalhes"

    operacional_conferido = metricas.merge(
        evidencia_resumo[
            (evidencia_resumo["alvo"] == "valor_aprovado")
            & (evidencia_resumo["tipo"] == "aprendizagem")
        ],
        on=["modelo", "tipo"],
        how="inner",
        suffixes=("_operacional", "_evidencia"),
        validate="one_to_one",
    )
    assert len(operacional_conferido) == len(metricas), \
        "Modelo operacional ausente da evidencia nominal"
    for coluna in ["MAE", "RMSE", "MAPE_pct", "MAPE_desvio_pct",
                   "MAPE_mediana_pct", "vies_pct", "recortes"]:
        assert np.allclose(
            operacional_conferido[f"{coluna}_operacional"],
            operacional_conferido[f"{coluna}_evidencia"],
        ), f"{coluna} diverge entre pipeline operacional e evidencia nominal"

    return {
        "meses": len(mensal),
        "periodo": f"{mensal['data'].min():%Y-%m} a {mensal['data'].max():%Y-%m}",
        "municipios": len(municipios),
        "modelo": metricas.iloc[0]["modelo"],
        "mape_12m": metricas.iloc[0]["MAPE_pct"],
        "janelas_backtest": n_janelas_esperado,
        "linhas_backtest_operacional": len(backtest_operacional),
        "modelos_evidencia": len(modelos_evidencia),
        "alvos_evidencia": len(EVIDENCE_TARGETS),
        "uf_ano": len(uf_anual),
        "trajetorias_comparaveis": total_comparaveis,
        "trajetorias_excluidas": total_excluidos,
        "documentos_dossie": len(documentos_paths),
    }


if __name__ == "__main__":
    resultado = validar()
    print("Validacao concluida sem erros")
    for chave, valor in resultado.items():
        print(f"- {chave}: {valor}")
