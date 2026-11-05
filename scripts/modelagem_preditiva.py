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
OFFICIAL_MODEL = "holt_winters_log"
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


def prever_sazonal_ingenuo(treino, passos, target):
    if passos > 12:
        raise ValueError("O benchmark sazonal atual suporta no maximo 12 passos.")
    valores = treino[target].astype(float).to_numpy()
    if len(valores) < 12:
        raise ValueError("O benchmark sazonal exige pelo menos 12 meses de treino.")
    return valores[-12:][:passos].copy()


def prever_holt_winters(treino, passos, target, use_boxcox=False):
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
            use_boxcox=use_boxcox,
        ).fit(optimized=True, remove_bias=False)
    convergiu = bool(modelo.mle_retvals.get("success", True)) and not any(
        issubclass(aviso.category, ConvergenceWarning) for aviso in avisos
    )
    previsao = np.maximum(np.asarray(modelo.forecast(passos), dtype=float), 0)
    return previsao, convergiu


def executar_backtest(df, target, incluir_estatisticos=True):
    origem_serie = df["data"].min()
    ultimo_inicio = df["data"].max() - pd.DateOffset(months=HORIZON - 1)
    inicios = pd.date_range(FIRST_BACKTEST, ultimo_inicio, freq="MS")
    janelas = []
    detalhes = []
    modelos = list(modelos_aprendizagem().items())
    if incluir_estatisticos:
        modelos.extend([
            ("sazonal_ingenuo", None),
            ("holt_winters", None),
            ("holt_winters_log", None),
        ])

    for nome, modelo in modelos:
        for inicio in inicios:
            treino = df[df["data"] < inicio].copy()
            teste = df[
                (df["data"] >= inicio)
                & (df["data"] < inicio + pd.DateOffset(months=HORIZON))
            ].copy()
            if len(treino) < 36 or len(teste) != HORIZON:
                continue
            if nome == "sazonal_ingenuo":
                pred = prever_sazonal_ingenuo(treino, HORIZON, target)
                tipo = "baseline"
                convergiu = True
            elif nome in {"holt_winters", "holt_winters_log"}:
                pred, convergiu = prever_holt_winters(
                    treino,
                    HORIZON,
                    target,
                    use_boxcox=0.0 if nome == "holt_winters_log" else False,
                )
                tipo = "estatistico"
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


def prever_modelo(nome, treino, datas_previsao, origem_serie, target):
    if nome == "sazonal_ingenuo":
        return prever_sazonal_ingenuo(treino, len(datas_previsao), target)
    if nome in {"holt_winters", "holt_winters_log"}:
        previsao, _ = prever_holt_winters(
            treino,
            len(datas_previsao),
            target,
            use_boxcox=0.0 if nome == "holt_winters_log" else False,
        )
        return previsao
    return prever_aprendizagem(
        modelos_aprendizagem()[nome], treino, datas_previsao, origem_serie, target
    )


def comparacao_ultimo_holdout(df, inicio, origem_serie, nomes_modelos):
    treino = df[df["data"] < inicio].copy()
    teste = df[df["data"] >= inicio].head(HORIZON).copy()
    comparacao = teste[["data", TARGET_NOMINAL]].copy()
    for nome in nomes_modelos:
        comparacao[nome] = prever_modelo(
            nome, treino, teste["data"], origem_serie, TARGET_NOMINAL
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


def gerar_handoff(
    df,
    resumo_evidencia,
    horizonte_evidencia,
    detalhes_operacionais,
):
    nominal = resumo_evidencia[resumo_evidencia["alvo"] == TARGET_NOMINAL].sort_values("MAPE_pct")
    real = resumo_evidencia[resumo_evidencia["alvo"] == TARGET_REAL].sort_values("MAPE_pct")
    oficial = nominal[nominal["modelo"] == OFFICIAL_MODEL].iloc[0]
    melhor_ml = nominal[nominal["tipo"] == "aprendizagem"].iloc[0]
    baseline = nominal[nominal["modelo"] == "sazonal_ingenuo"].iloc[0]
    provisórios = ", ".join(
        df.loc[df["provisorio"], "data"].dt.strftime("%Y-%m").tolist()
    )
    linhas = [
        "# Handoff — evidencia de modelo", "",
        "**Status:** modelo nominal selecionado por menor MAPE medio no protocolo congelado.", "",
        "Este arquivo e gerado por `python scripts/modelagem_preditiva.py`; os numeros abaixo "
        "sao lidos da serie nacional e dos resultados do proprio backtest, nao digitados manualmente.", "",
        "## Protocolo", "",
        f"- Entrada: `dados_tratados/{INPUT.name}`, serie mensal nacional continua de "
        f"{df['data'].min():%Y-%m} a {df['data'].max():%Y-%m}, com {len(df)} competencias.",
        f"- Alvos: `{TARGET_NOMINAL}` (R$ nominais) e `{TARGET_REAL}` "
        "(R$ corrigidos pelo IPCA para junho de 2026).",
        f"- Origem de avaliacao: {FIRST_BACKTEST:%Y-%m}; horizonte: {HORIZON} meses; "
        f"{int(oficial['recortes'])} janelas moveis mensais. Em cada origem, o treino "
        "usa apenas competencias anteriores e os 12 passos sao previstos sem incorporar "
        "observacoes intermediarias.",
        "- Benchmark: sazonal ingenuo, repetindo os 12 ultimos meses do treino.",
        "- Holt-Winters log: transformacao Box-Cox lambda 0, tendencia aditiva, sazonalidade "
        "aditiva, periodo 12, tendencia nao amortecida e inicializacao estimada.",
        "- Modelos supervisionados: regressao linear, Ridge, Random Forest e Gradient Boosting "
        "com as features temporais do pipeline (`indice_tempo`, `mes`, `mes_sin`, `mes_cos`).",
        "- MASE: MAE da janela dividido pelo MAE sazonal ingenuo de periodo 12, calculado "
        "somente dentro do respectivo treino. Ele nao substitui a comparacao explicita do benchmark no teste.",
        "- A faixa empirica de 95% usa o percentil 95 do erro absoluto historico por horizonte; "
        "nao e intervalo de confianca parametrico nem garantia de cobertura futura.",
        f"- Ambiente reproduzido: pandas {pd.__version__}, NumPy {np.__version__}, "
        f"scikit-learn {sklearn.__version__}, SciPy {scipy.__version__}, "
        f"statsmodels {statsmodels.__version__}; versoes fixadas em `requirements.txt`.", "",
        "## Decisao", "",
        f"- Modelo nominal oficial: `{OFFICIAL_MODEL}`; MAPE medio "
        f"{formatar_decimal(oficial['MAPE_pct'], 4)}%, MASE {formatar_decimal(oficial['MASE'], 4)} "
        f"e vies {formatar_decimal(oficial['vies_pct'], 4)}%.",
        f"- Melhor modelo de aprendizagem nominal: `{melhor_ml['modelo']}`; MAPE medio "
        f"{formatar_decimal(melhor_ml['MAPE_pct'], 4)}%.",
        f"- Benchmark sazonal explicito: MAPE medio {formatar_decimal(baseline['MAPE_pct'], 4)}%.",
        f"- Detalhe operacional: {len(detalhes_operacionais)} previsoes fora da amostra.",
        f"- A serie marca {provisórios} como competencias provisorias. Elas permanecem sem correcao "
        "automatica e entram nas ultimas janelas conforme o arquivo-fonte.", "",
        "## Alvo nominal", "",
        *tabela_resumo(resumo_evidencia, TARGET_NOMINAL), "",
        "## Alvo real", "",
        *tabela_resumo(resumo_evidencia, TARGET_REAL), "",
        "## Ressalvas", "",
        "- As 43 janelas se sobrepoem e nao sao observacoes independentes.",
        "- A selecao e comparativa e descritiva; nao existe holdout final pre-registrado.",
        "- Maio e junho de 2026 sao provisorios e nao receberam correcao automatica.",
        "- MAPE mede erro percentual medio; nao representa acuracia ou certeza.",
        "- O procedimento supervisionado atual e multietapas direto, nao recursivo.",
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
        resumo_evidencia[resumo_evidencia["alvo"] == TARGET_NOMINAL]
        .drop(columns=["alvo", "escala", "MASE", "ajustes_nao_convergentes"])
        .sort_values(["MAPE_pct", "RMSE"])
        .reset_index(drop=True)
    )
    janelas_operacionais = (
        janelas_evidencia[janelas_evidencia["alvo"] == TARGET_NOMINAL][
            ["modelo", "tipo", "inicio_teste", "fim_teste", "meses_teste",
             "MAE", "RMSE", "MAPE_pct", "vies_pct"]
        ]
        .reset_index(drop=True)
    )
    detalhes_operacionais = (
        detalhes_evidencia[detalhes_evidencia["alvo"] == TARGET_NOMINAL][
            ["modelo", "inicio_teste", "horizonte", "data", "valor_real",
             "valor_previsto", "residuo", "erro_absoluto_pct"]
        ]
        .reset_index(drop=True)
    )

    if OFFICIAL_MODEL not in set(resumo_operacional["modelo"]):
        raise ValueError(f"Modelo oficial ausente do backtest: {OFFICIAL_MODEL}")
    vencedor_nominal = resumo_operacional.iloc[0]["modelo"]
    if OFFICIAL_MODEL != vencedor_nominal:
        raise ValueError(
            "O modelo oficial deve ser o menor MAPE nominal no protocolo vigente: "
            f"esperado {vencedor_nominal}, configurado {OFFICIAL_MODEL}."
        )
    origem_serie = df["data"].min()
    ultimo_inicio = pd.Timestamp(janelas_operacionais["inicio_teste"].max() + "-01")
    comparacao = comparacao_ultimo_holdout(
        df,
        ultimo_inicio,
        origem_serie,
        resumo_operacional["modelo"].tolist(),
    )

    datas_futuras = pd.date_range(df["data"].max() + pd.DateOffset(months=1), periods=HORIZON, freq="MS")
    previsao = prever_modelo(
        OFFICIAL_MODEL,
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
        "Evidencia comparativa: sazonal ingenuo, Holt-Winters aditivo, Holt-Winters log-aditivo, Regressao Linear, Ridge, Random Forest e Gradient Boosting.",
        "Os modelos supervisionados usam tendencia temporal e sazonalidade mensal (mes, seno e cosseno do mes).",
        "O MASE usa como escala o erro sazonal ingenuo de 12 meses calculado somente dentro de cada treino; o benchmark tambem e avaliado explicitamente no teste.",
        "A faixa empirica de 95% usa o percentil 95 do erro absoluto de backtesting, separado por horizonte; ela nao e derivada do MAPE.", "",
        "## Primeiro: alvo nominal", "",
        "| modelo | tipo | MAPE medio | MAPE mediano | MASE | vies | janelas | ajustes sem convergencia |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
        *[f"| {r.modelo} | {r.tipo} | {r.MAPE_pct:.2f}% | {r.MAPE_mediana_pct:.2f}% | {r.MASE:.2f} | {r.vies_pct:.2f}% | {int(r.recortes)} | {int(r.ajustes_nao_convergentes)} |" for r in nominal.sort_values('MAPE_pct').itertuples(index=False)],
        "", f"No alvo nominal, o modelo selecionado por menor MAPE medio e `{OFFICIAL_MODEL}`.", "",
        "## Depois: alvo real", "",
        "| modelo | tipo | MAPE medio | MAPE mediano | MASE | vies | janelas | ajustes sem convergencia |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
        *[f"| {r.modelo} | {r.tipo} | {r.MAPE_pct:.2f}% | {r.MAPE_mediana_pct:.2f}% | {r.MASE:.2f} | {r.vies_pct:.2f}% | {int(r.recortes)} | {int(r.ajustes_nao_convergentes)} |" for r in real.sort_values('MAPE_pct').itertuples(index=False)],
        "", "No alvo real, o Gradient Boosting e comparado sem a tendencia inflacionaria embutida no alvo.", "",
        f"Modelo oficial selecionado pelo desempenho nominal: `{OFFICIAL_MODEL}`.",
        "O Gradient Boosting permanece como comparacao de aprendizagem de maquina.", "",
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
    print(f"\nModelo oficial selecionado: {OFFICIAL_MODEL}")


if __name__ == "__main__":
    main()
