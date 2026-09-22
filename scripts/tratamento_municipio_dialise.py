from pathlib import Path

import numpy as np
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT_DIR / "dados_brutos"
OUT_DIR = ROOT_DIR / "dados_tratados"

ARQ_VALOR_MUNICIPIO = RAW_DIR / "valor_municipio_dialise_brasil.csv"
ARQ_QTD_MUNICIPIO = RAW_DIR / "qtd_municipio_dialise_brasil.csv"
ARQ_ATUALIZACAO_VALOR = RAW_DIR / "atualizacao_2026_05_06_valor_municipio.csv"
ARQ_ATUALIZACAO_QTD = RAW_DIR / "atualizacao_2026_05_06_qtd_municipio.csv"

ANO_INICIO = 2015
ANO_PARCIAL_CORRENTE = 2026  # extracao em andamento: nunca "observado", so "provisorio"
ANOS_PRE = [str(ano) for ano in range(2015, 2020)]
ANOS_PANDEMIA = ["2020", "2021"]

# Onda 0.1 (docs/tarefas/aferidor-onda0-1.md): os cinco estados de um valor
# municipio x ano, definidos em docs/PLANO-V3-CONCEITO-C.md §3.2 e no Vault
# (PADRAO-DATAVIZ-ACESSIVEL §8.1, estendido). "estimado" nao ocorre neste
# pipeline (e reservado a saida de modelo/interpolacao, ex.: populacao 2023
# em integrar_ibge.py) e por isso nunca aparece na coluna estado_registro
# emitida aqui.
ESTADO_SEM_REGISTRO = "sem_registro"  # TabNet respondeu "-": sem procedimento aprovado no periodo
ESTADO_AUSENTE = "ausente"  # a celula nao existe nesta extracao (par nao encontrado no join)
ESTADO_PROVISORIO = "provisorio"  # numero real, mas de ano em extracao (2026 parcial)
ESTADO_OBSERVADO = "observado"  # numero real, ano fechado

# Prioridade para combinar o estado de valor_aprovado e qtd_aprovada na mesma
# linha municipio x ano: o estado mais cauteloso vence, para que nenhuma
# linha herde "observado" so porque um dos dois indicadores tinha numero.
_PRIORIDADE_ESTADO = {
    ESTADO_SEM_REGISTRO: 0,
    ESTADO_AUSENTE: 1,
    ESTADO_PROVISORIO: 2,
    ESTADO_OBSERVADO: 3,
}


def br_number_to_float(value):
    """Converte numero no formato brasileiro do TabNet.

    Onda 0.1: '-' deixa de virar 0.0. No TabNet, '-' significa "sem registro
    no periodo", nao "zero procedimentos". Devolver NaN aqui e o que permite
    a `classify_cell_state` (chamada antes desta funcao, sobre o valor bruto)
    marcar a celula como `sem_registro` em vez de deixar um zero silencioso
    entrar nas somas e nas variacoes percentuais.
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
    """Classifica o estado bruto de uma celula municipio x ano do TabNet,
    a partir do valor tal como veio do CSV (antes de `br_number_to_float`).

    Precisa rodar sobre o valor bruto porque, depois da conversao numerica,
    '-' e celula vazia ficam indistinguiveis (ambas viram NaN).
    """
    if pd.isna(value):
        return ESTADO_AUSENTE
    text = str(value).strip()
    if text == "-":
        return ESTADO_SEM_REGISTRO
    if text == "":
        return ESTADO_AUSENTE
    return ESTADO_PROVISORIO if int(ano) >= ANO_PARCIAL_CORRENTE else ESTADO_OBSERVADO


def combinar_estado(estado_a, estado_b):
    """Estado da linha = o mais cauteloso entre os dois indicadores (valor e
    quantidade). Empiricamente os dois arquivos do TabNet tem '-' exatamente
    nas mesmas celulas (conferido: 673/673 coincidem em 2015-2025), mas a
    combinacao fica defensiva para uma extracao futura onde isso nao valha.
    """
    a = estado_a if pd.notna(estado_a) else ESTADO_AUSENTE
    b = estado_b if pd.notna(estado_b) else ESTADO_AUSENTE
    return a if _PRIORIDADE_ESTADO[a] <= _PRIORIDADE_ESTADO[b] else b


def find_header_row(path):
    with path.open(encoding="latin1") as file:
        for index, line in enumerate(file):
            if line.startswith('"Mun') and "Total" in line:
                return index
    raise ValueError(f"Cabecalho municipal nao encontrado em {path}")


def load_municipio_file(path, metric_name):
    """Le um CSV municipal do TabNet e devolve (wide, estado_wide, long, anos).

    `wide` carrega os valores numericos (NaN onde nao ha registro real).
    `estado_wide` carrega, celula a celula, um dos quatro estados possiveis
    de origem (`observado`, `provisorio`, `sem_registro`, `ausente`) antes de
    qualquer combinacao entre valor e quantidade.
    """
    header_row = find_header_row(path)
    df = pd.read_csv(path, sep=";", skiprows=header_row, encoding="latin1")
    municipio_col = df.columns[0]
    df = df[df[municipio_col].astype(str).str.match(r"^\d{6}\s+")].copy()

    anos = [col for col in df.columns if str(col).isdigit()]

    # Estado de cada celula, medido sobre o valor bruto (precisa vir antes da
    # conversao numerica: depois dela, '-' e celula vazia ja sao o mesmo NaN).
    for col in anos:
        df[f"__estado_{col}"] = df[col].apply(lambda v, ano=col: classify_cell_state(v, ano))

    for col in anos + ["Total"]:
        if col in df.columns:
            # Sem fillna(0): '-' e celula vazia ficam NaN e carregam o estado
            # correspondente em `__estado_<ano>`; o numero so e preenchido
            # quando o TabNet realmente publicou um numero.
            df[col] = df[col].map(br_number_to_float)

    df["cod_municipio"] = df[municipio_col].astype(str).str.extract(r"^(\d{6})")
    df["municipio"] = df[municipio_col].astype(str).str.replace(r"^\d{6}\s+", "", regex=True).str.strip()
    df["uf_ibge"] = df["cod_municipio"].str[:2]

    anos_disponiveis = [ano for ano in anos if int(ano) >= ANO_INICIO]
    wide_cols = ["cod_municipio", "municipio", "uf_ibge"] + anos_disponiveis
    wide = df[wide_cols].copy()

    estado_wide = df[["cod_municipio", "municipio", "uf_ibge"] + [f"__estado_{a}" for a in anos_disponiveis]].copy()
    estado_wide.columns = ["cod_municipio", "municipio", "uf_ibge"] + anos_disponiveis

    long = wide.melt(
        id_vars=["cod_municipio", "municipio", "uf_ibge"],
        value_vars=anos_disponiveis,
        var_name="ano",
        value_name=metric_name,
    )
    long["ano"] = long["ano"].astype(int)

    estado_long = estado_wide.melt(
        id_vars=["cod_municipio", "municipio", "uf_ibge"],
        value_vars=anos_disponiveis,
        var_name="ano",
        value_name="estado_bruto",
    )
    estado_long["ano"] = estado_long["ano"].astype(int)

    long = long.merge(estado_long, on=["cod_municipio", "municipio", "uf_ibge", "ano"], how="left")

    return wide, estado_wide, long, anos_disponiveis


def safe_divide(numerator, denominator):
    return np.where(denominator > 0, numerator / denominator, np.nan)


def period_mean_com_exclusao(df, years):
    """Media do periodo ignorando anos sem registro/ausentes (`skipna=True`,
    o padrao do pandas), e contagem de quantos anos do periodo foram
    excluidos por isso — a parte de "reportar quantos pares foram
    excluidos" exigida na Onda 0.1.
    """
    cols = [year for year in years if year in df.columns]
    valores = df[cols]
    media = valores.mean(axis=1)
    excluidos = valores.isna().sum(axis=1)
    return media, excluidos


def append_partial_year(base_wide, base_estado_wide, update_path, metric_name):
    """Soma o ano parcial de 2026 (Jan-Abr do arquivo base + Mai-Jun da
    atualizacao) e recalcula o estado dessa celula a partir do resultado.

    Decisao explicita: se so um dos dois pedacos do ano tiver numero, o total
    usa o pedaco conhecido (o outro nao soma um zero presumido — a ausencia
    dele so deixa de aparecer no total, que continua marcado `provisorio`
    porque 2026 e ano corrente). Se os dois pedacos forem sem registro/
    ausentes, o total fica NaN e o estado vira `sem_registro`: nao ha nenhum
    numero conhecido para este municipio em 2026 ate a extracao atual.
    """
    if not update_path.exists():
        return base_wide, base_estado_wide

    update_wide, update_estado_wide, _, years = load_municipio_file(update_path, metric_name)
    if "2026" not in years:
        return base_wide, base_estado_wide

    update_values = update_wide.set_index("cod_municipio")["2026"]
    update_estados = update_estado_wide.set_index("cod_municipio")["2026"]

    result = base_wide.copy()
    result_estado = base_estado_wide.copy()

    base_2026 = result["2026"] if "2026" in result.columns else pd.Series(np.nan, index=result.index)
    add_2026 = result["cod_municipio"].map(update_values)
    ambos_ausentes = base_2026.isna() & add_2026.isna()
    total_2026 = base_2026.fillna(0) + add_2026.fillna(0)
    total_2026[ambos_ausentes] = np.nan
    result["2026"] = total_2026

    # Estado final de 2026 depende so de haver ou nao numero: qualquer numero
    # em 2026 e `provisorio` (ano corrente); nenhum numero, em nenhum dos
    # dois pedacos, e `sem_registro`. As classificacoes originais de cada
    # pedaco (que podiam ser `ausente` no municipio ausente do arquivo de
    # atualizacao) ficam subsumidas nesta regra binaria do ano parcial.
    result_estado["2026"] = np.where(total_2026.isna(), ESTADO_SEM_REGISTRO, ESTADO_PROVISORIO)
    # Preserva o estado bruto por-arquivo apenas para diagnostico, sem usar
    # `update_estados` alem do calculo acima (evita variavel nao usada).
    del update_estados

    return result, result_estado


def build_indicators(valor_wide, valor_estado_wide, qtd_wide, qtd_estado_wide, anos_analise):
    base_cols = ["cod_municipio", "municipio", "uf_ibge"]
    indicadores = valor_wide[base_cols].copy()
    anos_fechados = anos_analise[:-1] if anos_analise[-1] == "2026" else anos_analise
    periodo_label = f"{anos_fechados[0]}_{anos_fechados[-1]}"
    anos_pos = [year for year in anos_fechados if int(year) >= 2022]

    valor_years = valor_wide.set_index("cod_municipio")
    qtd_years = qtd_wide.set_index("cod_municipio")
    valor_estado_years = valor_estado_wide.set_index("cod_municipio")
    qtd_estado_years = qtd_estado_wide.set_index("cod_municipio")
    for year in anos_analise:
        # Decisao explicita: sem fillna(0) aqui. Onde nao ha registro, o
        # indicador anual fica NaN — combinado com `estado_{ano}` abaixo,
        # quem consumir esta tabela sabe que o dado nao existe, em vez de
        # ler um zero que parece observado.
        indicadores[f"valor_{year}"] = indicadores["cod_municipio"].map(valor_years[year])
        indicadores[f"qtd_{year}"] = indicadores["cod_municipio"].map(qtd_years[year])
        estado_valor = indicadores["cod_municipio"].map(valor_estado_years[year])
        estado_qtd = indicadores["cod_municipio"].map(qtd_estado_years[year])
        indicadores[f"estado_{year}"] = [
            combinar_estado(v, q) for v, q in zip(estado_valor, estado_qtd)
        ]

    valor_cols = [f"valor_{year}" for year in anos_fechados]
    qtd_cols = [f"qtd_{year}" for year in anos_fechados]
    indicadores["periodo_analise"] = periodo_label
    # min_count=1: soma vira NaN (nao 0) se TODOS os anos do periodo forem
    # sem_registro/ausentes para o municipio — caso raro, mas um municipio
    # sem nenhum ano conhecido no periodo nao pode parecer "zero observado".
    indicadores["valor_periodo"] = indicadores[valor_cols].sum(axis=1, min_count=1)
    indicadores["qtd_periodo"] = indicadores[qtd_cols].sum(axis=1, min_count=1)
    indicadores["anos_sem_registro_periodo"] = indicadores[
        [f"estado_{year}" for year in anos_fechados]
    ].isin([ESTADO_SEM_REGISTRO, ESTADO_AUSENTE]).sum(axis=1)
    indicadores["custo_medio_periodo"] = safe_divide(
        indicadores["valor_periodo"], indicadores["qtd_periodo"]
    )

    for period_name, years in {
        "pre_pandemia": ANOS_PRE,
        "pandemia": ANOS_PANDEMIA,
        "pos_pandemia": anos_pos,
    }.items():
        media_valor, excluidos_valor = period_mean_com_exclusao(
            indicadores.rename(columns={f"valor_{year}": year for year in anos_analise}), years
        )
        media_qtd, excluidos_qtd = period_mean_com_exclusao(
            indicadores.rename(columns={f"qtd_{year}": year for year in anos_analise}), years
        )
        indicadores[f"media_valor_{period_name}"] = media_valor
        indicadores[f"media_qtd_{period_name}"] = media_qtd
        # valor e qtd sao sem_registro nas mesmas celulas (ver combinar_estado);
        # guardamos as duas contagens para nao supor isso silenciosamente.
        indicadores[f"anos_excluidos_{period_name}"] = np.maximum(excluidos_valor, excluidos_qtd)

    indicadores["crescimento_valor_pos_vs_pre_pct"] = safe_divide(
        indicadores["media_valor_pos_pandemia"], indicadores["media_valor_pre_pandemia"]
    )
    indicadores["crescimento_valor_pos_vs_pre_pct"] = (
        indicadores["crescimento_valor_pos_vs_pre_pct"] - 1
    ) * 100
    indicadores["crescimento_qtd_pos_vs_pre_pct"] = safe_divide(
        indicadores["media_qtd_pos_pandemia"], indicadores["media_qtd_pre_pandemia"]
    )
    indicadores["crescimento_qtd_pos_vs_pre_pct"] = (
        indicadores["crescimento_qtd_pos_vs_pre_pct"] - 1
    ) * 100
    indicadores["anos_excluidos_crescimento"] = (
        indicadores["anos_excluidos_pre_pandemia"] + indicadores["anos_excluidos_pos_pandemia"]
    )

    total_valor = indicadores["valor_periodo"].sum()
    total_qtd = indicadores["qtd_periodo"].sum()
    indicadores["participacao_valor_nacional_pct"] = indicadores["valor_periodo"] / total_valor * 100
    indicadores["participacao_qtd_nacional_pct"] = indicadores["qtd_periodo"] / total_qtd * 100

    # sort_values manda NaN para o fim por padrao: municipios sem nenhum ano
    # conhecido no periodo (valor_periodo NaN) ficam ao final, nunca no topo
    # do ranking como se fossem "municipio com maior valor".
    indicadores = indicadores.sort_values("valor_periodo", ascending=False, na_position="last").reset_index(drop=True)
    # Ranking fica NaN (Int64 anulavel) para quem nao tem valor_periodo/
    # qtd_periodo conhecido — nao pode ganhar uma posicao no ranking por um
    # dado que nao existe.
    indicadores["ranking_valor"] = pd.array(
        np.where(indicadores["valor_periodo"].notna(), indicadores.index + 1, np.nan), dtype="Int64"
    )
    indicadores["ranking_qtd"] = indicadores["qtd_periodo"].rank(method="first", ascending=False, na_option="keep").astype("Int64")
    return indicadores


def main():
    valor_wide, valor_estado_wide, valor_long, _ = load_municipio_file(ARQ_VALOR_MUNICIPIO, "valor_aprovado")
    qtd_wide, qtd_estado_wide, qtd_long, _ = load_municipio_file(ARQ_QTD_MUNICIPIO, "qtd_aprovada")
    valor_wide, valor_estado_wide = append_partial_year(
        valor_wide, valor_estado_wide, ARQ_ATUALIZACAO_VALOR, "valor_aprovado"
    )
    qtd_wide, qtd_estado_wide = append_partial_year(
        qtd_wide, qtd_estado_wide, ARQ_ATUALIZACAO_QTD, "qtd_aprovada"
    )

    anos_wide = [c for c in valor_wide.columns if str(c).isdigit()]
    valor_long = valor_wide.melt(
        id_vars=["cod_municipio", "municipio", "uf_ibge"],
        value_vars=anos_wide,
        var_name="ano", value_name="valor_aprovado",
    )
    qtd_long = qtd_wide.melt(
        id_vars=["cod_municipio", "municipio", "uf_ibge"],
        value_vars=[c for c in qtd_wide.columns if str(c).isdigit()],
        var_name="ano", value_name="qtd_aprovada",
    )
    estado_valor_long = valor_estado_wide.melt(
        id_vars=["cod_municipio", "municipio", "uf_ibge"],
        value_vars=anos_wide,
        var_name="ano", value_name="estado_bruto_valor",
    )
    estado_qtd_long = qtd_estado_wide.melt(
        id_vars=["cod_municipio", "municipio", "uf_ibge"],
        value_vars=[c for c in qtd_estado_wide.columns if str(c).isdigit()],
        var_name="ano", value_name="estado_bruto_qtd",
    )
    valor_long["ano"] = valor_long["ano"].astype(int)
    qtd_long["ano"] = qtd_long["ano"].astype(int)
    estado_valor_long["ano"] = estado_valor_long["ano"].astype(int)
    estado_qtd_long["ano"] = estado_qtd_long["ano"].astype(int)

    anos_analise = [
        year
        for year in valor_wide.columns
        if str(year).isdigit() and year in qtd_wide.columns and int(year) >= ANO_INICIO
    ]

    long_df = valor_long.merge(
        qtd_long,
        on=["cod_municipio", "municipio", "uf_ibge", "ano"],
        how="outer",
    )
    long_df = long_df.merge(
        estado_valor_long, on=["cod_municipio", "municipio", "uf_ibge", "ano"], how="left"
    ).merge(
        estado_qtd_long, on=["cod_municipio", "municipio", "uf_ibge", "ano"], how="left"
    )
    long_df["estado_registro"] = [
        combinar_estado(v, q)
        for v, q in zip(long_df["estado_bruto_valor"], long_df["estado_bruto_qtd"])
    ]
    # Decisao explicita (antes: `.fillna({"valor_aprovado": 0, "qtd_aprovada": 0})`
    # incondicional): so preenche com 0 as linhas cujo estado e observado/
    # provisorio — ali um NaN residual so pode vir de um par valor/qtd
    # inconsistente entre os dois arquivos, nunca de sem_registro real. Linhas
    # `sem_registro`/`ausente` permanecem NaN: nao sao zero.
    tem_registro = long_df["estado_registro"].isin([ESTADO_OBSERVADO, ESTADO_PROVISORIO])
    long_df.loc[tem_registro, "valor_aprovado"] = long_df.loc[tem_registro, "valor_aprovado"].fillna(0)
    long_df.loc[tem_registro, "qtd_aprovada"] = long_df.loc[tem_registro, "qtd_aprovada"].fillna(0)
    long_df = long_df.drop(columns=["estado_bruto_valor", "estado_bruto_qtd"])

    long_df["custo_medio"] = safe_divide(long_df["valor_aprovado"], long_df["qtd_aprovada"])
    long_df = long_df.sort_values(["ano", "uf_ibge", "municipio"]).reset_index(drop=True)

    indicadores = build_indicators(valor_wide, valor_estado_wide, qtd_wide, qtd_estado_wide, anos_analise)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    valor_wide.to_csv(OUT_DIR / "valor_municipio_dialise_brasil_wide.csv", index=False, encoding="utf-8-sig")
    qtd_wide.to_csv(OUT_DIR / "qtd_municipio_dialise_brasil_wide.csv", index=False, encoding="utf-8-sig")
    long_df.to_csv(OUT_DIR / "municipio_dialise_brasil_long.csv", index=False, encoding="utf-8-sig")
    indicadores.to_csv(OUT_DIR / "indicadores_municipio_brasil.csv", index=False, encoding="utf-8-sig")

    n_sem_registro = (long_df["estado_registro"] == ESTADO_SEM_REGISTRO).sum()
    n_ausente = (long_df["estado_registro"] == ESTADO_AUSENTE).sum()
    n_excluidos_crescimento = int(indicadores["anos_excluidos_crescimento"].sum())
    print("Municipios tratados:", len(indicadores))
    print(f"Periodo municipal: {anos_analise[0]} a {anos_analise[-1]}")
    print("Valor total no periodo:", indicadores["valor_periodo"].sum())
    print("Quantidade total no periodo:", indicadores["qtd_periodo"].sum())
    print(
        f"Celulas municipio x ano sem_registro: {n_sem_registro} | ausentes: {n_ausente} "
        f"| de {len(long_df)} linhas totais"
    )
    print(
        f"Pares ano-municipio excluidos do calculo de crescimento pos_vs_pre "
        f"por sem_registro/ausente: {n_excluidos_crescimento}"
    )
    print(
        indicadores[
            [
                "ranking_valor",
                "ranking_qtd",
                "cod_municipio",
                "municipio",
                "valor_periodo",
                "qtd_periodo",
                "custo_medio_periodo",
                "crescimento_valor_pos_vs_pre_pct",
                "crescimento_qtd_pos_vs_pre_pct",
            ]
        ]
        .head(15)
        .to_string(index=False)
    )


if __name__ == "__main__":
    main()
