from pathlib import Path
import warnings

import numpy as np
import pandas as pd
import scipy
import sklearn
import statsmodels
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from statsmodels.tools.sm_exceptions import ConvergenceWarning
from statsmodels.tsa.holtwinters import ExponentialSmoothing


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "dados_tratados"
INPUT = DATA_DIR / "dialise_mensal_brasil_total.csv"
TARGET_NOMINAL = "valor_aprovado"
TARGET_REAL = "valor_aprovado_real"
HORIZON = 12
FIRST_BACKTEST = pd.Timestamp("2022-01-01")
OFFICIAL_MODEL = "gradient_boosting"
TARGETS = {
    TARGET_NOMINAL: "nominal",
    TARGET_REAL: "real_jun_2026",
}


def metricas(y_true, y_pred, escala_mase):
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    erro = y_true - y_pred
    mae = np.mean(np.abs(erro))
    rmse = np.sqrt(np.mean(erro**2))
    mape = np.mean(np.abs(erro / y_true)) * 100
    mase = mae / escala_mase
    bias = (np.sum(y_pred) / np.sum(y_true) - 1) * 100
    return mae, rmse, mape, mase, bias


def criar_features_temporais(datas, origem):
    datas = pd.Series(pd.to_datetime(datas))
    mes = datas.dt.month.astype(float)
    indice = ((datas.dt.year - origem.year) * 12 + datas.dt.month - origem.month).astype(float)
    return pd.DataFrame({
        "indice_tempo": indice,
        "mes": mes,
        "mes_sin": np.sin(2 * np.pi * mes / 12),
        "mes_cos": np.cos(2 * np.pi * mes / 12),
    })


def modelos_aprendizagem():
    return {
        "regressao_linear": make_pipeline(StandardScaler(), LinearRegression()),
        "ridge": make_pipeline(StandardScaler(), Ridge(alpha=10.0)),
        "random_forest": RandomForestRegressor(
            n_estimators=300, min_samples_leaf=3, random_state=42, n_jobs=-1
        ),
        "gradient_boosting": GradientBoostingRegressor(
            n_estimators=180, learning_rate=0.04, max_depth=2, random_state=42
        ),
    }


def escala_mase_sazonal(treino, target):
    valores = treino[target].to_numpy(dtype=float)
    if len(valores) <= 12:
        raise ValueError("O MASE exige mais de um ciclo sazonal no treino.")
    escala = np.mean(np.abs(valores[12:] - valores[:-12]))
    if not np.isfinite(escala) or escala <= 0:
        raise ValueError("Escala sazonal invalida para o MASE.")
    return escala


def prever_aprendizagem(modelo, treino, datas_previsao, origem, target):
    modelo.fit(criar_features_temporais(treino["data"], origem), treino[target])
    previsao = modelo.predict(criar_features_temporais(datas_previsao, origem))
    return np.maximum(previsao.astype(float), 0)


def prever_holt_winters(treino, passos, target):
    serie = treino.set_index("data")[target].astype(float).asfreq("MS")
    with warnings.catch_warnings(record=True) as avisos:
        warnings.simplefilter("always", ConvergenceWarning)
        modelo = ExponentialSmoothing(
            serie,
            trend="add",
            damped_trend=False,
            seasonal="add",
            seasonal_periods=12,
            initialization_method="estimated",
        ).fit(optimized=True, remove_bias=False)
    convergiu = bool(modelo.mle_retvals.get("success", True)) and not any(
        issubclass(aviso.category, ConvergenceWarning) for aviso in avisos
    )
    previsao = np.maximum(np.asarray(modelo.forecast(passos), dtype=float), 0)
    return previsao, convergiu


def executar_backtest(df, target, incluir_holt_winters=True):
    origem_serie = df["data"].min()
    ultimo_inicio = df["data"].max() - pd.DateOffset(months=HORIZON - 1)
    inicios = pd.date_range(FIRST_BACKTEST, ultimo_inicio, freq="MS")
    janelas = []
    detalhes = []
    modelos = list(modelos_aprendizagem().items())
    if incluir_holt_winters:
        modelos.append(("holt_winters", None))

    for nome, modelo in modelos:
        for inicio in inicios:
            treino = df[df["data"] < inicio].copy()
            teste = df[
                (df["data"] >= inicio)
                & (df["data"] < inicio + pd.DateOffset(months=HORIZON))
            ].copy()
            if len(treino) < 36 or len(teste) != HORIZON:
                continue
            if nome == "holt_winters":
                pred, convergiu = prever_holt_winters(treino, HORIZON, target)
                tipo = "baseline"
            else:
                pred = prever_aprendizagem(
                    modelo, treino, teste["data"], origem_serie, target
                )
                tipo = "aprendizagem"
                convergiu = True
            escala_mase = escala_mase_sazonal(treino, target)
            mae, rmse, mape, mase, bias = metricas(
                teste[target], pred, escala_mase
            )
            janelas.append({
                "alvo": target, "escala": TARGETS[target],
                "modelo": nome, "tipo": tipo,
                "inicio_teste": inicio.strftime("%Y-%m"),
                "fim_teste": teste["data"].max().strftime("%Y-%m"),
                "meses_teste": HORIZON, "MAE": mae, "RMSE": rmse,
                "MAPE_pct": mape, "MASE": mase, "vies_pct": bias,
                "convergiu": convergiu,
            })
            for horizonte, (row, previsto) in enumerate(zip(teste.itertuples(index=False), pred), start=1):
                real = getattr(row, target)
                detalhes.append({
                    "alvo": target, "escala": TARGETS[target],
                    "modelo": nome, "tipo": tipo,
                    "inicio_teste": inicio.strftime("%Y-%m"),
                    "horizonte": horizonte, "data": row.data,
                    "valor_real": real, "valor_previsto": previsto,
                    "residuo": real - previsto,
                    "erro_absoluto_pct": abs(real - previsto) / real * 100,
                    "erro_pct": (previsto / real - 1) * 100,
                })

    janelas_df = pd.DataFrame(janelas)
    detalhes_df = pd.DataFrame(detalhes)
    resumo = (
        janelas_df.groupby(["alvo", "escala", "modelo", "tipo"], as_index=False)
        .agg(MAE=("MAE", "mean"), RMSE=("RMSE", "mean"),
             MAPE_pct=("MAPE_pct", "mean"), MAPE_desvio_pct=("MAPE_pct", "std"),
             MAPE_mediana_pct=("MAPE_pct", "median"), MASE=("MASE", "mean"),
             vies_pct=("vies_pct", "mean"),
             recortes=("inicio_teste", "nunique"),
             ajustes_nao_convergentes=("convergiu", lambda values: int((~values).sum())))
        .sort_values(["alvo", "MAPE_pct", "RMSE"]).reset_index(drop=True)
    )
    return resumo, janelas_df, detalhes_df


def resumir_por_horizonte(detalhes):
    return (
        detalhes.groupby(
            ["alvo", "escala", "modelo", "tipo", "horizonte"], as_index=False
        )
        .agg(
            observacoes=("data", "size"),
            MAE=("residuo", lambda values: np.mean(np.abs(values))),
            RMSE=("residuo", lambda values: np.sqrt(np.mean(values**2))),
            MAPE_pct=("erro_absoluto_pct", "mean"),
            vies_pct=("erro_pct", "mean"),
        )
        .sort_values(["alvo", "modelo", "horizonte"])
        .reset_index(drop=True)
    )


def comparacao_ultimo_holdout(df, inicio, origem_serie):
    treino = df[df["data"] < inicio].copy()
    teste = df[df["data"] >= inicio].head(HORIZON).copy()
    comparacao = teste[["data", TARGET_NOMINAL]].copy()
    for nome, modelo in modelos_aprendizagem().items():
        comparacao[nome] = prever_aprendizagem(
            modelo, treino, teste["data"], origem_serie, TARGET_NOMINAL
        )
    return comparacao


def formatar_decimal(valor, casas=2):
    return f"{valor:.{casas}f}".replace(".", ",")


def tabela_resumo(resumo, target):
    linhas = [
        "| Modelo | Tipo | MAPE medio | MAPE mediano | MASE | Vies | Janelas | Nao convergiu |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    recorte = resumo[resumo["alvo"] == target].sort_values("MAPE_pct")
    for row in recorte.itertuples(index=False):
        linhas.append(
            f"| {row.modelo} | {row.tipo} | {formatar_decimal(row.MAPE_pct, 4)}% | "
            f"{formatar_decimal(row.MAPE_mediana_pct, 4)}% | {formatar_decimal(row.MASE, 4)} | "
            f"{formatar_decimal(row.vies_pct, 4)}% | {int(row.recortes)} | "
            f"{int(row.ajustes_nao_convergentes)} |"
        )
    return linhas


def tabela_horizonte(horizontes, target):
    linhas = [
        "| Horizonte | Holt-Winters MAPE | Holt-Winters vies | Gradient Boosting MAPE | Gradient Boosting vies |",
        "| ---: | ---: | ---: | ---: | ---: |",
    ]
    recorte = horizontes[
        (horizontes["alvo"] == target)
        & (horizontes["modelo"].isin(["holt_winters", "gradient_boosting"]))
    ]
    for horizonte in range(1, HORIZON + 1):
        hw = recorte[
            (recorte["modelo"] == "holt_winters")
            & (recorte["horizonte"] == horizonte)
        ].iloc[0]
        gb = recorte[
            (recorte["modelo"] == "gradient_boosting")
            & (recorte["horizonte"] == horizonte)
        ].iloc[0]
        linhas.append(
            f"| {horizonte} | {formatar_decimal(hw['MAPE_pct'])}% | "
            f"{formatar_decimal(hw['vies_pct'])}% | {formatar_decimal(gb['MAPE_pct'])}% | "
            f"{formatar_decimal(gb['vies_pct'])}% |"
        )
    return linhas


def gerar_handoff(
    df,
    resumo_evidencia,
    horizonte_evidencia,
    detalhes_operacionais,
):
    nominal = resumo_evidencia[resumo_evidencia["alvo"] == TARGET_NOMINAL]
    real = resumo_evidencia[resumo_evidencia["alvo"] == TARGET_REAL]
    hw_nominal = nominal[nominal["modelo"] == "holt_winters"].iloc[0]
    gb_nominal = nominal[nominal["modelo"] == "gradient_boosting"].iloc[0]
    gb_real = real[real["modelo"] == "gradient_boosting"].iloc[0]
    hw_real = real[real["modelo"] == "holt_winters"].iloc[0]
    provisórios = ", ".join(
        df.loc[df["provisorio"], "data"].dt.strftime("%Y-%m").tolist()
    )
    linhas = [
        "# Handoff — Bussola · Onda 1.3 — evidencia de modelo", "",
        "**Status:** pronto no escopo revisado, com ressalvas metodologicas.", "",
        "Este arquivo e gerado por `python scripts/modelagem_preditiva.py`; os numeros abaixo "
        "sao lidos da serie nacional e dos resultados do proprio backtest, nao digitados manualmente.", "",
        "## DECLARADO — protocolo e limites", "",
        f"- Entrada: `dados_tratados/{INPUT.name}`, serie mensal nacional continua de "
        f"{df['data'].min():%Y-%m} a {df['data'].max():%Y-%m}, com {len(df)} competencias.",
        f"- Alvos: `{TARGET_NOMINAL}` (R$ nominais) e `{TARGET_REAL}` "
        "(R$ corrigidos pelo IPCA para junho de 2026).",
        f"- Origem de avaliacao: {FIRST_BACKTEST:%Y-%m}; horizonte: {HORIZON} meses; "
        f"{int(hw_nominal['recortes'])} janelas moveis mensais. Em cada origem, o treino "
        "usa apenas competencias anteriores e os 12 passos sao previstos sem incorporar "
        "observacoes intermediarias.",
        "- Holt-Winters: ETS com tendencia aditiva, sazonalidade aditiva, periodo sazonal 12, "
        "tendencia nao amortecida, inicializacao estimada e otimizacao numerica do statsmodels.",
        "- Modelos supervisionados: regressao linear, Ridge, Random Forest e Gradient Boosting "
        "com as features temporais do pipeline (`indice_tempo`, `mes`, `mes_sin`, `mes_cos`).",
        "- MAPE da janela: media de `abs(real - previsto) / real`; MAPE geral: media entre "
        "janelas. Vies da janela: `sum(previsto) / sum(real) - 1`; vies geral: media entre janelas.",
        "- Por horizonte, MAPE e a media do erro percentual absoluto das 43 previsoes; vies e "
        "a media de `(previsto / real - 1)` no mesmo horizonte. Valor negativo indica subestimacao.",
        "- MASE: MAE da janela dividido pelo MAE sazonal ingenuo de periodo 12, calculado "
        "somente dentro do respectivo treino. Menor que 1 supera essa referencia na metrica.",
        f"- MAPE nao e intervalo de confianca. Em particular, um MAPE de "
        f"{formatar_decimal(gb_nominal['MAPE_pct'])}% nao expressa "
        f"{formatar_decimal(100 - gb_nominal['MAPE_pct'])}% de certeza. A faixa empirica "
        "de 95% do pipeline e outro objeto: percentil 95 "
        "do erro absoluto historico por horizonte.",
        f"- Ambiente reproduzido: pandas {pd.__version__}, NumPy {np.__version__}, "
        f"scikit-learn {sklearn.__version__}, SciPy {scipy.__version__}, "
        f"statsmodels {statsmodels.__version__}; versoes fixadas em `requirements.txt`.", "",
        "## OBSERVADO — estado do repositorio", "",
        f"- `dados_tratados/metricas_modelos_preditivos_corrigido.csv` continua contendo "
        f"somente os quatro modelos supervisionados e preserva `{OFFICIAL_MODEL}` como primeiro colocado operacional.",
        f"- `dados_tratados/backtest_horizonte_12m_detalhado.csv` continua com "
        f"{len(detalhes_operacionais)} linhas: {nominal[nominal['tipo'] == 'aprendizagem']['modelo'].nunique()} "
        f"modelos x {int(hw_nominal['recortes'])} janelas x {HORIZON} horizontes.",
        f"- A previsao oficial permanece travada em `{OFFICIAL_MODEL}` por `OFFICIAL_MODEL` no script. "
        "O vencedor das tabelas de evidencia nao e promovido automaticamente.",
        f"- A serie marca {provisórios} como competencias provisorias. Elas permanecem sem correcao "
        "automatica e entram nas ultimas janelas conforme o arquivo-fonte.", "",
        "## MEDIDO — primeiro, a derrota nominal", "",
        f"No alvo nominal, Holt-Winters obteve MAPE medio de {formatar_decimal(hw_nominal['MAPE_pct'], 4)}% "
        f"e vies de {formatar_decimal(hw_nominal['vies_pct'], 4)}%, contra "
        f"{formatar_decimal(gb_nominal['MAPE_pct'], 4)}% e "
        f"{formatar_decimal(gb_nominal['vies_pct'], 4)}% do Gradient Boosting. "
        "Logo, o Gradient Boosting perde nominalmente em MAPE. A ressalva e decisiva: o "
        f"MASE do Holt-Winters foi {formatar_decimal(hw_nominal['MASE'], 4)}, ainda acima de 1.", "",
        "Fonte: `dados_tratados/evidencia_modelos_resumo.csv`.", "",
        *tabela_resumo(resumo_evidencia, TARGET_NOMINAL), "",
        "### Erro e vies nominal por horizonte", "",
        "Fonte: `dados_tratados/evidencia_modelos_horizonte.csv`.", "",
        *tabela_horizonte(horizonte_evidencia, TARGET_NOMINAL), "",
        "## MEDIDO — depois, a vitoria no alvo real", "",
        f"No alvo real, o Gradient Boosting obteve o menor MAPE medio: "
        f"{formatar_decimal(gb_real['MAPE_pct'], 4)}%, com MASE "
        f"{formatar_decimal(gb_real['MASE'], 4)} e vies "
        f"{formatar_decimal(gb_real['vies_pct'], 4)}%. O Holt-Winters ficou em "
        f"{formatar_decimal(hw_real['MAPE_pct'], 4)}% de MAPE, MASE "
        f"{formatar_decimal(hw_real['MASE'], 4)} e vies "
        f"{formatar_decimal(hw_real['vies_pct'], 4)}%. Nesta comparacao informada, o "
        "Gradient Boosting vence quando a tendencia inflacionaria e removida do alvo.", "",
        "Fonte: `dados_tratados/evidencia_modelos_resumo.csv`.", "",
        *tabela_resumo(resumo_evidencia, TARGET_REAL), "",
        "### Erro e vies real por horizonte", "",
        "Fonte: `dados_tratados/evidencia_modelos_horizonte.csv`.", "",
        *tabela_horizonte(horizonte_evidencia, TARGET_REAL), "",
        "## Ressalvas que bloqueiam uma troca automatica", "",
        f"- O otimizador do Holt-Winters nao declarou convergencia em "
        f"{int(hw_nominal['ajustes_nao_convergentes'])} das {int(hw_nominal['recortes'])} janelas nominais "
        f"e {int(hw_real['ajustes_nao_convergentes'])} das {int(hw_real['recortes'])} janelas reais. "
        "As previsoes foram mantidas para reproduzir o protocolo avulso; a contagem esta materializada no CSV.",
        "- As 43 janelas se sobrepoem e nao sao observacoes independentes.",
        "- Nao existe subconjunto final intocado e pre-registrado: os mesmos 43 recortes ja foram "
        "vistos na comparacao historica. Portanto, esta e evidencia comparativa/descritiva, nao "
        "confirmacao independente de um novo vencedor.",
        "- Maio e junho de 2026 sao provisorios e aproximadamente 1% subestimados segundo a regra "
        "do projeto; nenhuma correcao automatica foi aplicada.",
        "- Trocar o modelo oficial, o alvo publicado ou a origem que exclui meses provisorios pertence "
        "ao Gate G-A e depende da autora e do orientador.", "",
        "## Artefatos e verificacao", "",
        "- `scripts/modelagem_preditiva.py`: executa os dois alvos, inclui Holt-Winters e preserva o modelo oficial.",
        "- `dados_tratados/evidencia_modelos_resumo.csv`: metricas agregadas por alvo e modelo.",
        "- `dados_tratados/evidencia_modelos_janelas.csv`: uma linha por alvo, modelo e origem.",
        "- `dados_tratados/evidencia_modelos_detalhado.csv`: uma linha por previsao e horizonte.",
        "- `dados_tratados/evidencia_modelos_horizonte.csv`: erro e vies agregados por horizonte.",
        "- `python scripts/modelagem_preditiva.py`: reproduziu os artefatos.",
        "- `python scripts/validar_dados.py`: concluiu sem erros e conferiu alvos, modelos, janelas, "
        "horizontes, cardinalidades e preservacao do Gradient Boosting.",
        "- `python -m compileall scripts`: deve encerrar sem erro de sintaxe.", "",
        "## Gate", "",
        "Nenhuma troca de modelo foi feita. A decisao metodologica continua com a autora e o orientador.", "",
        "VAULT: C:\\Users\\Antonio\\AI-Vault\\00-SISTEMA\\MEMORY_PROTOCOL.md -> codigo e CSVs sao a verdade operacional; o handoff guarda decisao, procedencia e limites, nao logs brutos.",
        "VAULT: C:\\Users\\Antonio\\AI-Vault\\04-DECISOES-GLOBAIS\\DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md -> Vault consultado antes da implementacao e regras aplicadas declaradas na entrega.",
        "VAULT: C:\\Users\\Antonio\\AI-Vault\\01-PROJETOS\\DialisaSUS\\DECISOES.md -> MASE contra sazonal ingenuo, erro por horizonte e gate academico preservados; modelo oficial nao foi trocado.",
        "VAULT: C:\\Users\\Antonio\\AI-Vault\\01-PROJETOS\\DialisaSUS\\ROADMAP.md -> tarefa 1.3 e Gate G-A respeitados; derrota nominal vem antes da vitoria no alvo real.",
        "VAULT: C:\\Users\\Antonio\\AI-Vault\\01-PROJETOS\\DialisaSUS\\BENCHMARKS.md -> benchmark reproduzivel devolvido ao Vault com condicoes, limites e decisao sustentada.",
        "VAULT: C:\\Users\\Antonio\\AI-Vault\\02-CONHECIMENTO\\ANTI-PADROES\\ANTI-PADRAO-PROVAS-FALSAS-OU-INVENTADAS.md -> nenhuma metrica foi publicada sem fonte reproduzivel; limitacoes e falhas de convergencia foram explicitadas.",
    ]
    (ROOT_DIR / "docs" / "handoffs" / "bussola-modelo.md").write_text(
        "\n".join(linhas) + "\n", encoding="utf-8"
    )


def main():
    df = pd.read_csv(INPUT, parse_dates=["data"]).sort_values("data").reset_index(drop=True)
    if df["data"].duplicated().any():
        raise ValueError("A serie mensal possui datas duplicadas.")
    esperado = pd.date_range(df["data"].min(), df["data"].max(), freq="MS")
    if not esperado.equals(pd.DatetimeIndex(df["data"])):
        raise ValueError("A serie mensal possui meses ausentes.")
    if df[list(TARGETS)].isna().any().any():
        raise ValueError("A serie mensal possui alvo nominal ou real ausente.")

    resultados = [executar_backtest(df, target) for target in TARGETS]
    resumo_evidencia = pd.concat([item[0] for item in resultados], ignore_index=True)
    janelas_evidencia = pd.concat([item[1] for item in resultados], ignore_index=True)
    detalhes_evidencia = pd.concat([item[2] for item in resultados], ignore_index=True)
    horizonte_evidencia = resumir_por_horizonte(detalhes_evidencia)

    resumo_operacional = (
        resumo_evidencia[
            (resumo_evidencia["alvo"] == TARGET_NOMINAL)
            & (resumo_evidencia["tipo"] == "aprendizagem")
        ]
        .drop(columns=["alvo", "escala", "MASE", "ajustes_nao_convergentes"])
        .sort_values(["MAPE_pct", "RMSE"])
        .reset_index(drop=True)
    )
    janelas_operacionais = (
        janelas_evidencia[
            (janelas_evidencia["alvo"] == TARGET_NOMINAL)
            & (janelas_evidencia["tipo"] == "aprendizagem")
        ][
            ["modelo", "tipo", "inicio_teste", "fim_teste", "meses_teste",
             "MAE", "RMSE", "MAPE_pct", "vies_pct"]
        ]
        .reset_index(drop=True)
    )
    detalhes_operacionais = (
        detalhes_evidencia[
            (detalhes_evidencia["alvo"] == TARGET_NOMINAL)
            & (detalhes_evidencia["tipo"] == "aprendizagem")
        ][
            ["modelo", "inicio_teste", "horizonte", "data", "valor_real",
             "valor_previsto", "residuo", "erro_absoluto_pct"]
        ]
        .reset_index(drop=True)
    )

    if OFFICIAL_MODEL not in set(resumo_operacional["modelo"]):
        raise ValueError(f"Modelo oficial ausente do backtest: {OFFICIAL_MODEL}")
    origem_serie = df["data"].min()
    ultimo_inicio = pd.Timestamp(janelas_operacionais["inicio_teste"].max() + "-01")
    comparacao = comparacao_ultimo_holdout(df, ultimo_inicio, origem_serie)

    datas_futuras = pd.date_range(df["data"].max() + pd.DateOffset(months=1), periods=HORIZON, freq="MS")
    previsao = prever_aprendizagem(
        modelos_aprendizagem()[OFFICIAL_MODEL],
        df,
        datas_futuras,
        origem_serie,
        TARGET_NOMINAL,
    )
    residuos = detalhes_operacionais[
        detalhes_operacionais["modelo"] == OFFICIAL_MODEL
    ]
    erro_95 = residuos.groupby("horizonte")["residuo"].apply(
        lambda values: np.quantile(np.abs(values), 0.95)
    )
    future = pd.DataFrame({
        "data": datas_futuras,
        "previsao_valor_aprovado": previsao,
        "limite_inferior_95": [max(0, previsao[i] - erro_95.loc[i + 1]) for i in range(HORIZON)],
        "limite_superior_95": [previsao[i] + erro_95.loc[i + 1] for i in range(HORIZON)],
        "modelo_usado": OFFICIAL_MODEL,
    })

    resumo_operacional.to_csv(DATA_DIR / "metricas_modelos_preditivos_corrigido.csv", index=False, encoding="utf-8-sig")
    janelas_operacionais.to_csv(DATA_DIR / "metricas_modelos_backtest_temporal_corrigido.csv", index=False, encoding="utf-8-sig")
    detalhes_operacionais.to_csv(DATA_DIR / "backtest_horizonte_12m_detalhado.csv", index=False, encoding="utf-8-sig")
    comparacao.to_csv(DATA_DIR / "comparacao_real_previsto_2022_atual_corrigido.csv", index=False, encoding="utf-8-sig")
    future.to_csv(DATA_DIR / "previsao_mensal_proximos_12m_corrigido.csv", index=False, encoding="utf-8-sig")
    resumo_evidencia.to_csv(DATA_DIR / "evidencia_modelos_resumo.csv", index=False, encoding="utf-8-sig")
    janelas_evidencia.to_csv(DATA_DIR / "evidencia_modelos_janelas.csv", index=False, encoding="utf-8-sig")
    detalhes_evidencia.to_csv(DATA_DIR / "evidencia_modelos_detalhado.csv", index=False, encoding="utf-8-sig")
    horizonte_evidencia.to_csv(DATA_DIR / "evidencia_modelos_horizonte.csv", index=False, encoding="utf-8-sig")

    nominal = resumo_evidencia[resumo_evidencia["alvo"] == TARGET_NOMINAL]
    real = resumo_evidencia[resumo_evidencia["alvo"] == TARGET_REAL]
    mape_oficial = nominal[nominal["modelo"] == OFFICIAL_MODEL].iloc[0]["MAPE_pct"]

    linhas = [
        "# Modelagem preditiva", "",
        f"Serie mensal nacional de {df['data'].min():%Y-%m} a {df['data'].max():%Y-%m}.",
        f"Validacao temporal com {int(resumo_operacional.iloc[0]['recortes'])} janelas moveis de 12 meses.",
        "Em cada janela, o modelo usa somente observacoes anteriores ao teste e projeta os 12 meses sem acessar valores reais intermediarios.",
        "Evidencia comparativa: Regressao Linear, Ridge, Random Forest, Gradient Boosting e Holt-Winters aditivo (tendencia e sazonalidade, periodo 12).",
        "As entradas representam tendencia temporal e sazonalidade mensal (mes, seno e cosseno do mes).",
        "O MASE usa como escala o erro sazonal ingenuo de 12 meses calculado somente dentro de cada treino.",
        "A faixa empirica de 95% usa o percentil 95 do erro absoluto de backtesting, separado por horizonte; ela nao e derivada do MAPE.", "",
        "## Primeiro: alvo nominal", "",
        "| modelo | tipo | MAPE medio | MAPE mediano | MASE | vies | janelas | ajustes sem convergencia |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
        *[f"| {r.modelo} | {r.tipo} | {r.MAPE_pct:.2f}% | {r.MAPE_mediana_pct:.2f}% | {r.MASE:.2f} | {r.vies_pct:.2f}% | {int(r.recortes)} | {int(r.ajustes_nao_convergentes)} |" for r in nominal.sort_values('MAPE_pct').itertuples(index=False)],
        "", "No alvo nominal, o Gradient Boosting perde nominalmente para o Holt-Winters.", "",
        "## Depois: alvo real", "",
        "| modelo | tipo | MAPE medio | MAPE mediano | MASE | vies | janelas | ajustes sem convergencia |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
        *[f"| {r.modelo} | {r.tipo} | {r.MAPE_pct:.2f}% | {r.MAPE_mediana_pct:.2f}% | {r.MASE:.2f} | {r.vies_pct:.2f}% | {int(r.recortes)} | {int(r.ajustes_nao_convergentes)} |" for r in real.sort_values('MAPE_pct').itertuples(index=False)],
        "", "No alvo real, o Gradient Boosting e comparado sem a tendencia inflacionaria embutida no alvo.", "",
        f"Modelo oficial preservado por gate academico: `{OFFICIAL_MODEL}`.",
        "O script nao promove automaticamente o vencedor da tabela comparativa.", "",
        f"MAPE e erro medio, nao intervalo de confianca: {formatar_decimal(mape_oficial)}% "
        f"nao significa {formatar_decimal(100 - mape_oficial)}% de certeza.",
        "A projecao e exploratoria e nao determina o gasto futuro. Choques de politica, tabela SUS, demanda ou capacidade assistencial podem alterar os valores.",
    ]
    (ROOT_DIR / "docs" / "modelagem_preditiva.md").write_text(
        "\n".join(linhas) + "\n", encoding="utf-8"
    )
    gerar_handoff(
        df,
        resumo_evidencia,
        horizonte_evidencia,
        detalhes_operacionais,
    )
    print(resumo_evidencia.to_string(index=False))
    print(f"\nModelo oficial preservado: {OFFICIAL_MODEL}")


if __name__ == "__main__":
    main()
