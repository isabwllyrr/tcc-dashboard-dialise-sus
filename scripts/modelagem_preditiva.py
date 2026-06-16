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

FEATURES = [
    "ano",
    "mes",
    "indice_tempo",
    "mes_sin",
    "mes_cos",
    "lag_1",
    "lag_2",
    "lag_3",
    "lag_6",
    "lag_12",
    "media_3m",
    "media_6m",
    "media_12m",
    "qtd_lag_1",
    "qtd_media_3m",
    "custo_lag_1",
]


def metricas(y_true, y_pred):
    erro = y_true - y_pred
    mae = np.mean(np.abs(erro))
    rmse = np.sqrt(np.mean(erro**2))
    mape = np.mean(np.abs(erro / y_true)) * 100
    return mae, rmse, mape


def previsao_media_movel(treino, teste, janela=12):
    historico = list(treino)
    preds = []
    for real in teste:
        preds.append(float(np.mean(historico[-janela:])))
        historico.append(float(real))
    return np.array(preds)


def previsao_sazonal_ingenua(treino, teste, sazonalidade=12):
    historico = list(treino)
    preds = []
    for real in teste:
        preds.append(float(historico[-sazonalidade]))
        historico.append(float(real))
    return np.array(preds)


def previsao_tendencia_linear(datas_treino, treino, datas_pred):
    x = np.arange(len(datas_treino), dtype=float)
    coef = np.polyfit(x, treino, deg=1)
    x_pred = np.arange(len(datas_treino), len(datas_treino) + len(datas_pred), dtype=float)
    return np.polyval(coef, x_pred)


def criar_features(df):
    dados = df.copy().sort_values("data").reset_index(drop=True)
    dados["indice_tempo"] = np.arange(len(dados))
    dados["mes_sin"] = np.sin(2 * np.pi * dados["mes"] / 12)
    dados["mes_cos"] = np.cos(2 * np.pi * dados["mes"] / 12)
    dados["lag_1"] = dados[TARGET].shift(1)
    dados["lag_2"] = dados[TARGET].shift(2)
    dados["lag_3"] = dados[TARGET].shift(3)
    dados["lag_6"] = dados[TARGET].shift(6)
    dados["lag_12"] = dados[TARGET].shift(12)
    dados["media_3m"] = dados[TARGET].shift(1).rolling(3).mean()
    dados["media_6m"] = dados[TARGET].shift(1).rolling(6).mean()
    dados["media_12m"] = dados[TARGET].shift(1).rolling(12).mean()
    dados["qtd_lag_1"] = dados["qtd_aprovada"].shift(1)
    dados["qtd_media_3m"] = dados["qtd_aprovada"].shift(1).rolling(3).mean()
    dados["custo_lag_1"] = dados["custo_medio"].shift(1)
    return dados.dropna().reset_index(drop=True)


def modelos_aprendizagem():
    return {
        "regressao_linear": make_pipeline(StandardScaler(), LinearRegression()),
        "ridge": make_pipeline(StandardScaler(), Ridge(alpha=10.0)),
        "random_forest": RandomForestRegressor(
            n_estimators=500,
            min_samples_leaf=3,
            random_state=42,
        ),
        "gradient_boosting": GradientBoostingRegressor(
            n_estimators=250,
            learning_rate=0.04,
            max_depth=2,
            random_state=42,
        ),
    }


def previsao_modelo_aprendizagem(modelo, df_historico, datas_futuras):
    historico = df_historico.copy().sort_values("data").reset_index(drop=True)
    preds = []
    for data in datas_futuras:
        nova_linha = {
            "data": data,
            "ano": data.year,
            "mes": data.month,
            TARGET: np.nan,
            "qtd_aprovada": historico["qtd_aprovada"].tail(12).mean(),
            "custo_medio": historico["custo_medio"].tail(12).mean(),
        }
        base_pred = pd.concat([historico, pd.DataFrame([nova_linha])], ignore_index=True)
        features_pred = criar_features(base_pred).tail(1)
        pred = float(modelo.predict(features_pred[FEATURES])[0])
        preds.append(pred)
        nova_linha[TARGET] = pred
        historico = pd.concat([historico, pd.DataFrame([nova_linha])], ignore_index=True)
    return np.array(preds)


def avaliar_recorte(df, inicio_teste, meses_teste=None):
    inicio_teste = pd.Timestamp(inicio_teste)
    treino_df = df[df["data"] < inicio_teste].copy()
    teste_df = df[df["data"] >= inicio_teste].copy()
    if meses_teste is not None:
        teste_df = teste_df.head(meses_teste).copy()
    if len(treino_df) < 24 or teste_df.empty:
        return [], pd.DataFrame()

    y_train = treino_df[TARGET].astype(float).to_numpy()
    y_test = teste_df[TARGET].astype(float).to_numpy()
    resultados = []

    pred_media = previsao_media_movel(y_train, y_test, janela=12)
    pred_sazonal = previsao_sazonal_ingenua(y_train, y_test, sazonalidade=12)
    pred_linear = previsao_tendencia_linear(treino_df["data"], y_train, teste_df["data"])
    predicoes = {
        "media_movel_12m": ("baseline", pred_media),
        "sazonal_ingenuo_12m": ("baseline", pred_sazonal),
        "tendencia_linear": ("baseline", pred_linear),
    }

    features_df = criar_features(df)
    features_treino = features_df[features_df["data"] < inicio_teste].copy()
    features_teste = features_df[features_df["data"].isin(teste_df["data"])].copy()
    if not features_treino.empty and len(features_teste) == len(teste_df):
        x_train = features_treino[FEATURES]
        y_train_ml = features_treino[TARGET]
        x_test = features_teste[FEATURES]
        for nome, modelo in modelos_aprendizagem().items():
            modelo.fit(x_train, y_train_ml)
            predicoes[nome] = ("aprendizagem", modelo.predict(x_test))

    comparacao = teste_df[["data", TARGET]].copy()
    for nome, (tipo, pred) in predicoes.items():
        mae, rmse, mape = metricas(y_test, pred)
        resultados.append({
            "modelo": nome,
            "tipo": tipo,
            "inicio_teste": inicio_teste.strftime("%Y-%m"),
            "meses_teste": len(teste_df),
            "MAE": mae,
            "RMSE": rmse,
            "MAPE_pct": mape,
        })
        comparacao[nome] = pred
    return resultados, comparacao


def main():
    df = pd.read_csv(INPUT, parse_dates=["data"]).sort_values("data").reset_index(drop=True)
    serie = df[TARGET].astype(float).to_numpy()
    periodo_inicio = df["data"].min().strftime("%Y-%m")
    periodo_fim = df["data"].max().strftime("%Y-%m")
    features_df = criar_features(df)

    holdout_resultados, comparacao = avaliar_recorte(df, "2022-01-01")
    holdout_df = pd.DataFrame(holdout_resultados).sort_values("MAPE_pct")

    recortes = ["2019-01-01", "2020-01-01", "2021-01-01", "2022-01-01", "2023-01-01", "2024-01-01", "2025-01-01"]
    backtest_resultados = []
    for recorte in recortes:
        resultados, _ = avaliar_recorte(df, recorte, meses_teste=12)
        backtest_resultados.extend(resultados)

    backtest_detalhado = pd.DataFrame(backtest_resultados)
    metricas_df = (
        backtest_detalhado
        .groupby(["modelo", "tipo"], as_index=False)
        .agg(
            MAE=("MAE", "mean"),
            RMSE=("RMSE", "mean"),
            MAPE_pct=("MAPE_pct", "mean"),
            MAPE_desvio_pct=("MAPE_pct", "std"),
            recortes=("inicio_teste", "nunique"),
        )
        .sort_values(["MAPE_pct", "RMSE"])
    )
    melhor = metricas_df.iloc[0]["modelo"]

    datas_futuras = pd.date_range(df["data"].max() + pd.DateOffset(months=1), periods=12, freq="MS")
    future = pd.DataFrame({"data": datas_futuras})

    if melhor == "sazonal_ingenuo_12m":
        future_pred = df.tail(12)[TARGET].to_numpy()
    elif melhor == "media_movel_12m":
        historico = list(serie)
        preds = []
        for _ in range(12):
            pred = float(np.mean(historico[-12:]))
            preds.append(pred)
            historico.append(pred)
        future_pred = np.array(preds)
    elif melhor == "tendencia_linear":
        x_all = np.arange(len(df), dtype=float)
        coef = np.polyfit(x_all, serie, deg=1)
        x_future = np.arange(len(df), len(df) + 12, dtype=float)
        future_pred = np.polyval(coef, x_future)
    else:
        modelo = modelos_aprendizagem()[melhor]
        modelo.fit(features_df[FEATURES], features_df[TARGET])
        future_pred = previsao_modelo_aprendizagem(modelo, df, datas_futuras)

    future["previsao_valor_aprovado"] = future_pred
    future["modelo_usado"] = melhor

    metricas_df.to_csv(DATA_DIR / "metricas_modelos_preditivos_corrigido.csv", index=False, encoding="utf-8-sig")
    holdout_df.to_csv(DATA_DIR / "metricas_modelos_holdout_2022_atual_corrigido.csv", index=False, encoding="utf-8-sig")
    backtest_detalhado.to_csv(DATA_DIR / "metricas_modelos_backtest_temporal_corrigido.csv", index=False, encoding="utf-8-sig")
    comparacao.to_csv(DATA_DIR / "comparacao_real_previsto_2022_atual_corrigido.csv", index=False, encoding="utf-8-sig")
    future.to_csv(DATA_DIR / "previsao_mensal_proximos_12m_corrigido.csv", index=False, encoding="utf-8-sig")

    linhas = [
        "# Modelagem preditiva inicial",
        "",
        f"A serie mensal de valor aprovado cobre {periodo_inicio} a {periodo_fim}.",
        "A validacao principal usa backtesting temporal com multiplos recortes anuais de 12 meses.",
        "Tambem foi mantido um holdout de 2022 ate o ultimo mes disponivel para comparacao historica.",
        "Foram avaliados baselines estatisticos e modelos supervisionados de aprendizagem de maquina.",
        "Os modelos de aprendizagem usam variaveis temporais, defasagens do valor aprovado, medias moveis, quantidade aprovada e custo medio defasado.",
        "",
        "## Metricas do backtesting temporal",
        "",
        "| modelo | tipo | MAE medio | RMSE medio | MAPE medio | desvio MAPE | recortes |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        *[
            f"| {r.modelo} | {r.tipo} | {r.MAE:.2f} | {r.RMSE:.2f} | {r.MAPE_pct:.2f}% | {r.MAPE_desvio_pct:.2f}% | {int(r.recortes)} |"
            for r in metricas_df.itertuples(index=False)
        ],
        "",
        f"Modelo selecionado pelo menor MAPE medio no backtesting temporal: `{melhor}`.",
        "",
        "## Holdout 2022 ate o ultimo mes disponivel",
        "",
        "| modelo | tipo | MAE | RMSE | MAPE_pct |",
        "| --- | --- | --- | --- | --- |",
        *[
            f"| {r.modelo} | {r.tipo} | {r.MAE:.2f} | {r.RMSE:.2f} | {r.MAPE_pct:.2f}% |"
            for r in holdout_df.itertuples(index=False)
        ],
        "",
        "## Observacao metodologica",
        "",
        "Esta e uma modelagem inicial. Para a versao final do TCC, as previsoes devem ser discutidas como apoio exploratorio a gestao, nao como determinacao exata do gasto futuro.",
        "",
    ]
    (ROOT_DIR / "docs" / "modelagem_preditiva.md").write_text("\n".join(linhas), encoding="utf-8")

    print(metricas_df.to_string(index=False))
    print("\nHoldout 2022 ate o ultimo mes disponivel:")
    print(holdout_df.to_string(index=False))
    print(f"Modelo selecionado: {melhor}")


if __name__ == "__main__":
    main()
