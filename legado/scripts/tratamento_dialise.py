from pathlib import Path

import numpy as np
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
BASE_DIR = ROOT_DIR
OUT_DIR = ROOT_DIR / "dados_tratados"

ARQ_VALOR_MES = BASE_DIR / "sia_cnv_qace094212177_19_126_92.csv"
ARQ_QTD_MUNICIPIO = BASE_DIR / "sia_cnv_qace094359177_19_126_92.csv"
ARQ_VALOR_PROCEDIMENTO = BASE_DIR / "sia_cnv_qace094828177_19_126_92.csv"


def br_money_to_float(value):
    """Convert TabNet Brazilian numeric strings to float."""
    if pd.isna(value):
        return np.nan
    value = str(value).strip()
    if value in {"", "-"}:
        return 0.0
    return float(value.replace(".", "").replace(",", "."))


def load_tabnet_csv(path):
    return pd.read_csv(path, sep=";", skiprows=3, encoding="latin1")


def load_valor_mes():
    df = load_tabnet_csv(ARQ_VALOR_MES)
    df.columns = ["ano_mes", "valor_aprovado"]
    df["valor_aprovado"] = df["valor_aprovado"].map(br_money_to_float)

    # Keep only real year/month rows. This removes Total, Fonte and Notas rows.
    df["ano"] = df["ano_mes"].astype(str).str.extract(r"(\d{4})").astype("Int64")
    df = df[df["ano"].notna()].copy()

    df["nivel"] = np.where(
        df["ano_mes"].astype(str).str.startswith(".."),
        "mensal",
        "anual",
    )
    df["mes_nome"] = (
        df["ano_mes"]
        .astype(str)
        .str.replace("..", "", regex=False)
        .str.extract(r"^([^/]+)")
    )
    return df


def load_qtd_municipio():
    df = load_tabnet_csv(ARQ_QTD_MUNICIPIO)
    anos = [col for col in df.columns if str(col).strip().isdigit()]
    df.columns = ["municipio"] + anos + ["total"]

    df["cod_ibge"] = df["municipio"].str.extract(r"^(\d+)")
    df["nome_municipio"] = (
        df["municipio"].str.replace(r"^\d+\s*", "", regex=True).str.strip()
    )
    df = df[df["cod_ibge"].notna()].copy()

    for col in anos + ["total"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    return df, anos


def load_valor_procedimento():
    df = load_tabnet_csv(ARQ_VALOR_PROCEDIMENTO)
    anos = [col for col in df.columns if str(col).strip().isdigit()]
    df.columns = ["procedimento"] + anos + ["total"]

    df["cod_procedimento"] = df["procedimento"].str.extract(r"^(\d+)")
    df["nome_procedimento"] = (
        df["procedimento"].str.replace(r"^\d+\s*", "", regex=True).str.strip()
    )
    df = df[df["cod_procedimento"].notna()].copy()

    for col in anos + ["total"]:
        df[col] = df[col].map(br_money_to_float).fillna(0)
    return df, anos


def filter_dialysis_procedures(df):
    # Strict filter to avoid false positives such as "renal" exams or "transradial" prostheses.
    pattern = (
        r"HEMODIALISE|DIALISE PERITONEAL|DIALISE|"
        r"P/HEMODIALISE|P/ HEMODIALISE|SESSAO DE HEMODIALISE"
    )
    return df[
        df["nome_procedimento"].str.contains(pattern, case=False, na=False, regex=True)
    ].copy()


def annual_dialysis_summary(df_dialise, anos, df_proc):
    dialise_anual = df_dialise[anos].sum().reset_index()
    dialise_anual.columns = ["ano", "valor_dialise"]
    dialise_anual["ano"] = dialise_anual["ano"].astype(int)

    total_ambulatorial = df_proc[anos].sum().reset_index()
    total_ambulatorial.columns = ["ano", "valor_ambulatorial_total"]
    total_ambulatorial["ano"] = total_ambulatorial["ano"].astype(int)

    resumo = dialise_anual.merge(total_ambulatorial, on="ano", how="left")
    resumo["participacao_dialise_pct"] = (
        resumo["valor_dialise"] / resumo["valor_ambulatorial_total"] * 100
    )
    resumo["variacao_anual_pct"] = resumo["valor_dialise"].pct_change() * 100
    return resumo


def baseline_forecast(resumo, forecast_years=(2024, 2025, 2026)):
    treino = resumo.dropna(subset=["valor_dialise"]).copy()
    x = treino["ano"].to_numpy(dtype=float)
    y = treino["valor_dialise"].to_numpy(dtype=float)

    # Baseline trend model. With only 9 annual observations, prefer transparency over complexity.
    slope, intercept = np.polyfit(x, y, deg=1)
    fitted = slope * x + intercept
    rmse = float(np.sqrt(np.mean((y - fitted) ** 2)))
    mape = float(np.mean(np.abs((y - fitted) / y)) * 100)

    future = np.array(list(forecast_years), dtype=float)
    linear_pred = slope * future + intercept

    first_year = int(x[0])
    last_year = int(x[-1])
    cagr = (y[-1] / y[0]) ** (1 / (last_year - first_year)) - 1

    prev = y[-1]
    rows = []
    for year, value in zip(future.astype(int), linear_pred):
        rows.append(
            {
                "ano": year,
                "previsao_valor_dialise": max(float(value), 0.0),
                "crescimento_vs_2023_pct": (float(value) / prev - 1) * 100,
                "modelo": "tendencia_linear_anual",
                "rmse_treino": rmse,
                "mape_treino_pct": mape,
            }
        )
    for year in future.astype(int):
        value = prev * ((1 + cagr) ** (year - last_year))
        rows.append(
            {
                "ano": year,
                "previsao_valor_dialise": float(value),
                "crescimento_vs_2023_pct": (float(value) / prev - 1) * 100,
                "modelo": "crescimento_historico_cagr",
                "rmse_treino": np.nan,
                "mape_treino_pct": np.nan,
            }
        )
    return pd.DataFrame(rows)


def main():
    df_valor_mes = load_valor_mes()
    df_municipio, anos_municipio = load_qtd_municipio()
    df_proc, anos_proc = load_valor_procedimento()
    df_dialise = filter_dialysis_procedures(df_proc)

    resumo_anual = annual_dialysis_summary(df_dialise, anos_proc, df_proc)
    previsao = baseline_forecast(resumo_anual)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    resumo_anual.to_csv(OUT_DIR / "resultado_dialise_anual.csv", index=False, encoding="utf-8-sig")
    previsao.to_csv(OUT_DIR / "previsao_dialise_2024_2026.csv", index=False, encoding="utf-8-sig")
    df_dialise[
        ["cod_procedimento", "nome_procedimento", "total"] + anos_proc
    ].sort_values("total", ascending=False).to_csv(
        OUT_DIR / "procedimentos_dialise_filtrados.csv",
        index=False,
        encoding="utf-8-sig",
    )

    print("Arquivos carregados")
    print(f"- valor mensal: {df_valor_mes.shape}")
    print(f"- municipios: {df_municipio.shape}")
    print(f"- procedimentos: {df_proc.shape}")
    print(f"- procedimentos de dialise filtrados: {df_dialise.shape[0]}")
    print()
    print("Resumo anual de custo da dialise")
    print(resumo_anual.to_string(index=False))
    print()
    print("Previsao base")
    print(previsao.to_string(index=False))


if __name__ == "__main__":
    main()


