from pathlib import Path

import numpy as np
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT_DIR / "dados_brutos"
OUT_DIR = ROOT_DIR / "dados_tratados"

ARQ_VALOR = RAW_DIR / "valor_mensal_dialise_brasil.csv"
ARQ_QTD = RAW_DIR / "qtd_mensal_dialise_brasil.csv"
ARQ_ATUALIZACAO_VALOR = RAW_DIR / "atualizacao_2026_05_06_valor_mensal_grupo.csv"
ARQ_ATUALIZACAO_QTD = RAW_DIR / "atualizacao_2026_05_06_qtd_mensal_grupo.csv"

MESES = {
    "Janeiro": 1,
    "Fevereiro": 2,
    "Marco": 3,
    "Março": 3,
    "Mar�o": 3,
    "Abril": 4,
    "Maio": 5,
    "Junho": 6,
    "Julho": 7,
    "Agosto": 8,
    "Setembro": 9,
    "Outubro": 10,
    "Novembro": 11,
    "Dezembro": 12,
}

ANO_PARCIAL_CORRENTE = 2026  # extracao em andamento: nunca "observado", so "provisorio"

# Onda 0.1 (docs/tarefas/aferidor-onda0-1.md): mesmos cinco estados usados em
# tratamento_municipio_dialise.py — ver o comentario la para a definicao
# completa. "estimado" nao ocorre neste pipeline.
ESTADO_SEM_REGISTRO = "sem_registro"
ESTADO_AUSENTE = "ausente"
ESTADO_PROVISORIO = "provisorio"
ESTADO_OBSERVADO = "observado"


def br_number_to_float(value):
    """Converte numero no formato brasileiro do TabNet.

    Onda 0.1: '-' deixa de virar 0.0. No TabNet, '-' significa "sem registro
    no periodo", nao "zero procedimentos" — ver `classify_cell_state`, que
    roda sobre o valor bruto (antes desta conversao) para preservar essa
    distincao.
    """
    if pd.isna(value):
        return np.nan
    if isinstance(value, (int, float, np.integer, np.floating)):
        return float(value)
    value = str(value).strip()
    if value in {"", "-"}:
        return np.nan
    return float(value.replace(".", "").replace(",", "."))


def classify_cell_state(value, ano):
    """Mesma logica de tratamento_municipio_dialise.py, aplicada ao valor
    bruto de uma celula grupo_procedimento x mes do TabNet."""
    if pd.isna(value):
        return ESTADO_AUSENTE
    text = str(value).strip()
    if text == "-":
        return ESTADO_SEM_REGISTRO
    if text == "":
        return ESTADO_AUSENTE
    return ESTADO_PROVISORIO if int(ano) >= ANO_PARCIAL_CORRENTE else ESTADO_OBSERVADO


def find_header_row(path):
    with path.open(encoding="latin1") as file:
        for index, line in enumerate(file):
            if "Ano/m" in line and "Total" in line:
                return index
    raise ValueError(f"Cabecalho da tabela nao encontrado em {path}")


def load_tabnet_monthly(path, value_name):
    header_row = find_header_row(path)
    df = pd.read_csv(path, sep=";", skiprows=header_row, encoding="latin1")
    df = df.rename(columns={df.columns[0]: "ano_mes"})

    # Mantem apenas linhas mensais, como "Janeiro/2015", "..Janeiro/2015" ou "  Janeiro/2021".
    df["ano_mes"] = df["ano_mes"].astype(str).str.replace("..", "", regex=False).str.strip()
    month_pattern = r"^(Janeiro|Fevereiro|Marco|Março|Mar�o|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)/\d{4}$"
    df = df[df["ano_mes"].str.match(month_pattern, na=False)].copy()

    df["mes_nome"] = df["ano_mes"].str.extract(r"^([^/]+)")
    df["ano"] = df["ano_mes"].str.extract(r"/(\d{4})").astype(int)
    df["mes"] = df["mes_nome"].map(MESES).astype(int)
    df["data"] = pd.to_datetime(dict(year=df["ano"], month=df["mes"], day=1))

    group_cols = [col for col in df.columns if col not in {"ano_mes", "mes_nome", "ano", "mes", "data", "Total"}]
    estado_frames = []
    for col in group_cols:
        estado_col = df.apply(lambda row, c=col: classify_cell_state(row[c], row["ano"]), axis=1)
        estado_frames.append(estado_col.rename(col))
        df[col] = df[col].map(br_number_to_float)
    estado_df = pd.concat(estado_frames, axis=1)
    estado_df[["data", "ano", "mes", "mes_nome"]] = df[["data", "ano", "mes", "mes_nome"]]

    valores = df.melt(
        id_vars=["data", "ano", "mes", "mes_nome"],
        value_vars=group_cols,
        var_name="grupo_procedimento",
        value_name=value_name,
    )
    estados = estado_df.melt(
        id_vars=["data", "ano", "mes", "mes_nome"],
        value_vars=group_cols,
        var_name="grupo_procedimento",
        value_name="estado_bruto",
    )
    return valores.merge(estados, on=["data", "ano", "mes", "mes_nome", "grupo_procedimento"], how="left")


def load_tabnet_group_update(path, value_name):
    with path.open(encoding="latin1") as file:
        header_row = next(
            i for i, line in enumerate(file)
            if "Grupo procedimento" in line and "Total" in line
        )
    df = pd.read_csv(path, sep=";", skiprows=header_row, encoding="latin1")
    group_col = df.columns[0]
    df = df[df[group_col].astype(str).str.match(r"^\d{2}\s")].copy()
    month_cols = [col for col in df.columns if str(col).startswith("2026/")]
    month_numbers = {
        "Jan": 1, "Fev": 2, "Mar": 3, "Abr": 4, "Mai": 5, "Jun": 6,
        "Jul": 7, "Ago": 8, "Set": 9, "Out": 10, "Nov": 11, "Dez": 12,
    }
    long = df.melt(
        id_vars=[group_col], value_vars=month_cols,
        var_name="ano_mes", value_name=value_name,
    )
    long["ano"] = long["ano_mes"].str[:4].astype(int)
    # Decisao explicita: sem fillna(0). '-' e celula vazia viram NaN, e o
    # estado (calculado sobre o valor bruto ANTES da conversao numerica, na
    # linha seguinte) registra se era sem_registro, ausente ou um numero
    # real (sempre `provisorio` aqui: esta e a atualizacao do ano corrente).
    long["estado_bruto"] = long.apply(
        lambda row: classify_cell_state(row[value_name], row["ano"]), axis=1
    )
    long[value_name] = long[value_name].map(br_number_to_float)
    long["mes"] = long["ano_mes"].str[-3:].map(month_numbers).astype(int)
    long["data"] = pd.to_datetime(dict(year=long["ano"], month=long["mes"], day=1))
    long["mes_nome"] = long["mes"].map({value: key for key, value in MESES.items()})
    return long.rename(columns={group_col: "grupo_procedimento"})[
        ["data", "ano", "mes", "mes_nome", "grupo_procedimento", value_name, "estado_bruto"]
    ]


def main():
    valor = load_tabnet_monthly(ARQ_VALOR, "valor_aprovado")
    qtd = load_tabnet_monthly(ARQ_QTD, "qtd_aprovada")

    if ARQ_ATUALIZACAO_VALOR.exists() and ARQ_ATUALIZACAO_QTD.exists():
        ultimo_mes_base = valor["data"].max()
        valor_update = load_tabnet_group_update(ARQ_ATUALIZACAO_VALOR, "valor_aprovado")
        qtd_update = load_tabnet_group_update(ARQ_ATUALIZACAO_QTD, "qtd_aprovada")
        valor = pd.concat(
            [valor, valor_update[valor_update["data"] > ultimo_mes_base]], ignore_index=True
        )
        qtd = pd.concat(
            [qtd, qtd_update[qtd_update["data"] > ultimo_mes_base]], ignore_index=True
        )

    base = valor.merge(
        qtd,
        on=["data", "ano", "mes", "mes_nome", "grupo_procedimento"],
        how="outer",
        suffixes=("_valor", "_qtd"),
    )
    base = base[base["ano"] >= 2015].copy()
    # O transporte sanitario apareceu apenas na atualizacao de 2026 e mudaria
    # o conceito da serie. O painel mantem o escopo assistencial historico.
    # (Questao de escopo ja registrada como aberta pelo projeto: grupo 08.)
    base = base[~base["grupo_procedimento"].str.startswith("08 ", na=False)].copy()

    base["estado_bruto_valor"] = base["estado_bruto_valor"].fillna(ESTADO_AUSENTE)
    base["estado_bruto_qtd"] = base["estado_bruto_qtd"].fillna(ESTADO_AUSENTE)
    prioridade = {ESTADO_SEM_REGISTRO: 0, ESTADO_AUSENTE: 1, ESTADO_PROVISORIO: 2, ESTADO_OBSERVADO: 3}
    base["estado_registro"] = [
        v if prioridade[v] <= prioridade[q] else q
        for v, q in zip(base["estado_bruto_valor"], base["estado_bruto_qtd"])
    ]
    base = base.drop(columns=["estado_bruto_valor", "estado_bruto_qtd"])

    # Decisao explicita (antes: fillna(0) incondicional nas duas colunas):
    # so preenche com 0 onde o estado indica numero real (observado ou
    # provisorio). Sem_registro/ausente ficam NaN — nao sao zero.
    tem_registro = base["estado_registro"].isin([ESTADO_OBSERVADO, ESTADO_PROVISORIO])
    base.loc[tem_registro, "valor_aprovado"] = base.loc[tem_registro, "valor_aprovado"].fillna(0)
    base.loc[tem_registro, "qtd_aprovada"] = base.loc[tem_registro, "qtd_aprovada"].fillna(0)
    base["custo_medio"] = np.where(
        base["qtd_aprovada"] > 0,
        base["valor_aprovado"] / base["qtd_aprovada"],
        np.nan,
    )
    base = base.sort_values(["data", "grupo_procedimento"]).reset_index(drop=True)

    # Serie nacional mensal (todos os grupos somados): decisao explicita de
    # nao propagar `estado_registro` por grupo para este agregado — combinar
    # o estado de N grupos numa unica linha nacional e uma decisao de design
    # nova, fora do escopo desta onda (que pede a coluna nas tabelas
    # municipais). Nenhum grupo do escopo assistencial (03/04/07) tem
    # sem_registro nos dados brutos atuais, entao esta lacuna e teorica hoje;
    # `sum()` do pandas ja ignora NaN por padrao, entao um sem_registro
    # futuro num grupo não gera zero fabricado no total, so fica de fora da
    # soma silenciosamente — reportado aqui, nao escondido.
    total_mensal = (
        base.groupby(["data", "ano", "mes"], as_index=False)
        .agg(valor_aprovado=("valor_aprovado", "sum"), qtd_aprovada=("qtd_aprovada", "sum"))
    )
    total_mensal["custo_medio"] = total_mensal["valor_aprovado"] / total_mensal["qtd_aprovada"]
    # Meses provisorios: menos ciclos de processamento acumulados, ~1% subestimados.
    meses_provisorios = pd.to_datetime(["2026-05-01", "2026-06-01"])
    total_mensal["provisorio"] = total_mensal["data"].isin(meses_provisorios)

    total_anual = (
        total_mensal.groupby("ano", as_index=False)
        .agg(valor_aprovado=("valor_aprovado", "sum"), qtd_aprovada=("qtd_aprovada", "sum"))
    )
    meses_por_ano = total_mensal.groupby("ano")["mes"].nunique().rename("meses_disponiveis")
    total_anual = total_anual.merge(meses_por_ano, on="ano", how="left")
    total_anual["ano_completo"] = total_anual["meses_disponiveis"] == 12
    total_anual["custo_medio"] = total_anual["valor_aprovado"] / total_anual["qtd_aprovada"]
    total_anual["variacao_valor_pct"] = total_anual["valor_aprovado"].pct_change() * 100
    total_anual.loc[~total_anual["ano_completo"], "variacao_valor_pct"] = np.nan

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    base.to_csv(OUT_DIR / "dialise_mensal_brasil_por_grupo.csv", index=False, encoding="utf-8-sig")
    total_mensal.to_csv(OUT_DIR / "dialise_mensal_brasil_total.csv", index=False, encoding="utf-8-sig")
    total_anual.to_csv(OUT_DIR / "dialise_anual_brasil_total.csv", index=False, encoding="utf-8-sig")

    n_sem_registro = (base["estado_registro"] == ESTADO_SEM_REGISTRO).sum()
    print("Base mensal por grupo:", base.shape)
    print("Total mensal:", total_mensal.shape)
    print("Total anual:", total_anual.shape)
    print(f"Celulas grupo x mes sem_registro (no escopo assistencial, pos-filtro do grupo 08): {n_sem_registro}")
    print(total_anual.to_string(index=False))


if __name__ == "__main__":
    main()
