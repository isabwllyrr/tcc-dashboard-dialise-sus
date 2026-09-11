from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "dados_tratados"
INPUT = DATA_DIR / "dialise_mensal_brasil_total.csv"
TARGET = "valor_aprovado"
HORIZON = 12
FIRST_BACKTEST = pd.Timestamp("2022-01-01")


def metricas(y_true, y_pred):
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    erro = y_true - y_pred
    mae = np.mean(np.abs(erro))
    rmse = np.sqrt(np.mean(erro**2))
    mape = np.mean(np.abs(erro / y_true)) * 100
    bias = (np.sum(y_pred) / np.sum(y_true) - 1) * 100
    return mae, rmse, mape, bias


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


def prever(modelo, treino, datas_previsao, origem):
    modelo.fit(criar_features_temporais(treino["data"], origem), treino[TARGET])
    previsao = modelo.predict(criar_features_temporais(datas_previsao, origem))
    return np.maximum(previsao.astype(float), 0)


def executar_backtest(df):
    origem_serie = df["data"].min()
    ultimo_inicio = df["data"].max() - pd.DateOffset(months=HORIZON - 1)
    inicios = pd.date_range(FIRST_BACKTEST, ultimo_inicio, freq="MS")
    janelas = []
    detalhes = []

    for nome, modelo in modelos_aprendizagem().items():
        for inicio in inicios:
            treino = df[df["data"] < inicio].copy()
            teste = df[
                (df["data"] >= inicio)
                & (df["data"] < inicio + pd.DateOffset(months=HORIZON))
            ].copy()
            if len(treino) < 36 or len(teste) != HORIZON:
                continue
            pred = prever(modelo, treino, teste["data"], origem_serie)
            mae, rmse, mape, bias = metricas(teste[TARGET], pred)
            janelas.append({
                "modelo": nome, "tipo": "aprendizagem",
                "inicio_teste": inicio.strftime("%Y-%m"),
                "fim_teste": teste["data"].max().strftime("%Y-%m"),
                "meses_teste": HORIZON, "MAE": mae, "RMSE": rmse,
                "MAPE_pct": mape, "vies_pct": bias,
            })
            for horizonte, (row, previsto) in enumerate(zip(teste.itertuples(index=False), pred), start=1):
                real = getattr(row, TARGET)
                detalhes.append({
                    "modelo": nome, "inicio_teste": inicio.strftime("%Y-%m"),
                    "horizonte": horizonte, "data": row.data,
                    "valor_real": real, "valor_previsto": previsto,
                    "residuo": real - previsto,
                    "erro_absoluto_pct": abs(real - previsto) / real * 100,
                })

    janelas_df = pd.DataFrame(janelas)
    detalhes_df = pd.DataFrame(detalhes)
    resumo = (
        janelas_df.groupby(["modelo", "tipo"], as_index=False)
        .agg(MAE=("MAE", "mean"), RMSE=("RMSE", "mean"),
             MAPE_pct=("MAPE_pct", "mean"), MAPE_desvio_pct=("MAPE_pct", "std"),
             MAPE_mediana_pct=("MAPE_pct", "median"), vies_pct=("vies_pct", "mean"),
             recortes=("inicio_teste", "nunique"))
        .sort_values(["MAPE_pct", "RMSE"]).reset_index(drop=True)
    )
    return resumo, janelas_df, detalhes_df


def comparacao_ultimo_holdout(df, inicio, origem_serie):
    treino = df[df["data"] < inicio].copy()
    teste = df[df["data"] >= inicio].head(HORIZON).copy()
    comparacao = teste[["data", TARGET]].copy()
    for nome, modelo in modelos_aprendizagem().items():
        comparacao[nome] = prever(modelo, treino, teste["data"], origem_serie)
    return comparacao


def main():
    df = pd.read_csv(INPUT, parse_dates=["data"]).sort_values("data").reset_index(drop=True)
    if df["data"].duplicated().any():
        raise ValueError("A serie mensal possui datas duplicadas.")
    esperado = pd.date_range(df["data"].min(), df["data"].max(), freq="MS")
    if not esperado.equals(pd.DatetimeIndex(df["data"])):
        raise ValueError("A serie mensal possui meses ausentes.")

    resumo, janelas, detalhes = executar_backtest(df)
    melhor = resumo.iloc[0]["modelo"]
    origem_serie = df["data"].min()
    ultimo_inicio = pd.Timestamp(janelas["inicio_teste"].max() + "-01")
    comparacao = comparacao_ultimo_holdout(df, ultimo_inicio, origem_serie)

    datas_futuras = pd.date_range(df["data"].max() + pd.DateOffset(months=1), periods=HORIZON, freq="MS")
    previsao = prever(modelos_aprendizagem()[melhor], df, datas_futuras, origem_serie)
    residuos = detalhes[detalhes["modelo"] == melhor]
    erro_95 = residuos.groupby("horizonte")["residuo"].apply(
        lambda values: np.quantile(np.abs(values), 0.95)
    )
    future = pd.DataFrame({
        "data": datas_futuras,
        "previsao_valor_aprovado": previsao,
        "limite_inferior_95": [max(0, previsao[i] - erro_95.loc[i + 1]) for i in range(HORIZON)],
        "limite_superior_95": [previsao[i] + erro_95.loc[i + 1] for i in range(HORIZON)],
        "modelo_usado": melhor,
    })

    resumo.to_csv(DATA_DIR / "metricas_modelos_preditivos_corrigido.csv", index=False, encoding="utf-8-sig")
    janelas.to_csv(DATA_DIR / "metricas_modelos_backtest_temporal_corrigido.csv", index=False, encoding="utf-8-sig")
    detalhes.to_csv(DATA_DIR / "backtest_horizonte_12m_detalhado.csv", index=False, encoding="utf-8-sig")
    comparacao.to_csv(DATA_DIR / "comparacao_real_previsto_2022_atual_corrigido.csv", index=False, encoding="utf-8-sig")
    future.to_csv(DATA_DIR / "previsao_mensal_proximos_12m_corrigido.csv", index=False, encoding="utf-8-sig")

    linhas = [
        "# Modelagem preditiva", "",
        f"Serie mensal nacional de {df['data'].min():%Y-%m} a {df['data'].max():%Y-%m}.",
        f"Validacao temporal com {int(resumo.iloc[0]['recortes'])} janelas moveis de 12 meses.",
        "Em cada janela, o modelo usa somente observacoes anteriores ao teste e projeta os 12 meses sem acessar valores reais intermediarios.",
        "Foram comparados apenas modelos supervisionados: Regressao Linear, Ridge, Random Forest e Gradient Boosting.",
        "As entradas representam tendencia temporal e sazonalidade mensal (mes, seno e cosseno do mes).",
        "A faixa empirica de 95% usa o percentil 95 do erro absoluto de backtesting, separado por horizonte.", "",
        "| modelo | MAPE medio | desvio MAPE | MAPE mediano | vies | janelas |",
        "| --- | --- | --- | --- | --- | --- |",
        *[f"| {r.modelo} | {r.MAPE_pct:.2f}% | {r.MAPE_desvio_pct:.2f}% | {r.MAPE_mediana_pct:.2f}% | {r.vies_pct:.2f}% | {int(r.recortes)} |" for r in resumo.itertuples(index=False)],
        "", f"Modelo selecionado pelo menor MAPE medio de 12 meses: `{melhor}`.", "",
        "A projecao e exploratoria e nao determina o gasto futuro. Choques de politica, tabela SUS, demanda ou capacidade assistencial podem alterar os valores.",
    ]
    (ROOT_DIR / "docs" / "modelagem_preditiva.md").write_text("\n".join(linhas), encoding="utf-8")
    print(resumo.to_string(index=False))
    print(f"\nModelo selecionado: {melhor}")


if __name__ == "__main__":
    main()
