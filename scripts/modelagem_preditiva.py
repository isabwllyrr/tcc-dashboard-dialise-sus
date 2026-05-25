from pathlib import Path

import numpy as np
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "dados_tratados"
INPUT = DATA_DIR / "dialise_mensal_brasil_total.csv"


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


def main():
    df = pd.read_csv(INPUT, parse_dates=["data"]).sort_values("data").reset_index(drop=True)
    serie = df["valor_aprovado"].astype(float).to_numpy()

    treino_df = df[df["data"] < "2022-01-01"].copy()
    teste_df = df[df["data"] >= "2022-01-01"].copy()
    y_train = treino_df["valor_aprovado"].astype(float).to_numpy()
    y_test = teste_df["valor_aprovado"].astype(float).to_numpy()

    modelos = []
    pred_media = previsao_media_movel(y_train, y_test, janela=12)
    pred_sazonal = previsao_sazonal_ingenua(y_train, y_test, sazonalidade=12)
    pred_linear = previsao_tendencia_linear(treino_df["data"], y_train, teste_df["data"])

    for nome, pred in [
        ("media_movel_12m", pred_media),
        ("sazonal_ingenuo_12m", pred_sazonal),
        ("tendencia_linear", pred_linear),
    ]:
        mae, rmse, mape = metricas(y_test, pred)
        modelos.append({"modelo": nome, "MAE": mae, "RMSE": rmse, "MAPE_pct": mape})

    metricas_df = pd.DataFrame(modelos).sort_values("MAPE_pct")
    melhor = metricas_df.iloc[0]["modelo"]

    comparacao = teste_df[["data", "valor_aprovado"]].copy()
    comparacao["media_movel_12m"] = pred_media
    comparacao["sazonal_ingenuo_12m"] = pred_sazonal
    comparacao["tendencia_linear"] = pred_linear

    datas_futuras = pd.date_range(df["data"].max() + pd.DateOffset(months=1), periods=12, freq="MS")
    future = pd.DataFrame({"data": datas_futuras})

    if melhor == "sazonal_ingenuo_12m":
        future_pred = df.tail(12)["valor_aprovado"].to_numpy()
    elif melhor == "media_movel_12m":
        historico = list(serie)
        preds = []
        for _ in range(12):
            pred = float(np.mean(historico[-12:]))
            preds.append(pred)
            historico.append(pred)
        future_pred = np.array(preds)
    else:
        x_all = np.arange(len(df), dtype=float)
        coef = np.polyfit(x_all, serie, deg=1)
        x_future = np.arange(len(df), len(df) + 12, dtype=float)
        future_pred = np.polyval(coef, x_future)

    future["previsao_valor_aprovado"] = future_pred
    future["modelo_usado"] = melhor

    metricas_df.to_csv(DATA_DIR / "metricas_modelos_preditivos.csv", index=False, encoding="utf-8-sig")
    comparacao.to_csv(DATA_DIR / "comparacao_real_previsto_2022_2023.csv", index=False, encoding="utf-8-sig")
    future.to_csv(DATA_DIR / "previsao_mensal_proximos_12m.csv", index=False, encoding="utf-8-sig")

    linhas = [
        "# Modelagem preditiva inicial",
        "",
        "A serie mensal de valor aprovado foi dividida em treino (2015 a 2021) e teste (2022 a 2023).",
        "Foram avaliados tres modelos simples e transparentes: media movel de 12 meses, sazonal ingenuo de 12 meses e tendencia linear.",
        "",
        "## Metricas no periodo de teste",
        "",
        "| modelo | MAE | RMSE | MAPE_pct |",
        "| --- | --- | --- | --- |",
        *[f"| {r.modelo} | {r.MAE:.2f} | {r.RMSE:.2f} | {r.MAPE_pct:.2f}% |" for r in metricas_df.itertuples(index=False)],
        "",
        f"Modelo selecionado pelo menor MAPE: `{melhor}`.",
        "",
        "## Observacao metodologica",
        "",
        "Esta e uma modelagem inicial. Para a versao final do TCC, as previsoes devem ser discutidas como apoio exploratorio a gestao, nao como determinacao exata do gasto futuro.",
        "",
    ]
    (ROOT_DIR / "docs" / "modelagem_preditiva.md").write_text("\n".join(linhas), encoding="utf-8")

    print(metricas_df.to_string(index=False))
    print(f"Modelo selecionado: {melhor}")


if __name__ == "__main__":
    main()

