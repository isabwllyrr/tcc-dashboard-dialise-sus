"""Materializa os agregados territoriais canônicos da Onda 1.2.

Grão de entrada: município de atendimento x ano.
Grão das saídas:
- UF x ano completo (2015–2025);
- faixa de variação municipal do valor aprovado real (2015→2025).

Ausência de registro nunca é convertida em zero. Taxas estaduais usam a
população completa da UF no IBGE, não apenas municípios presentes no SIA.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dados_tratados"
GEOJSON = ROOT / "src" / "data" / "brazil-states.geojson"

MUNICIPIOS = DATA / "municipio_dialise_brasil_long.csv"
POPULACAO = DATA / "populacao_municipio_2015_2025.csv"
NACIONAL = DATA / "dialise_anual_brasil_total.csv"

SAIDA_UF = DATA / "dialise_uf_total_anual.csv"
SAIDA_TRAJETORIAS = DATA / "distribuicao_trajetorias_municipais.csv"

ANO_INICIO = 2015
ANO_FIM = 2025
ESTADOS_COM_NUMERO = {"observado", "provisorio", "estimado"}
ESTADOS_SEM_NUMERO = {"sem_registro", "ausente"}

COLUNAS_UF = [
    "uf",
    "ano",
    "qtd_aprovada",
    "valor_aprovado_nominal",
    "valor_aprovado_real",
    "populacao",
    "taxa_qtd_100k",
    "valor_real_per_capita",
]

COLUNAS_TRAJETORIAS = [
    "registro_tipo",
    "faixa",
    "ordem",
    "limite_inferior_pct",
    "limite_superior_pct",
    "municipios",
    "percentual_validos",
    "periodo_inicio",
    "periodo_fim",
    "metrica",
    "incluido_na_distribuicao",
    "motivo_exclusao",
]


def carregar_mapa_ufs() -> tuple[dict[str, str], dict[str, str]]:
    geo = json.loads(GEOJSON.read_text(encoding="utf-8"))
    codigo_para_sigla: dict[str, str] = {}
    nomes: dict[str, str] = {}
    for feature in geo["features"]:
        props = feature["properties"]
        sigla = str(props["sigla"]).upper()
        codigo = str(props["codigo_ibg"]).zfill(2)
        codigo_para_sigla[codigo] = sigla
        nomes[sigla] = str(props["name"])
    if len(codigo_para_sigla) != 27 or len(nomes) != 27:
        raise ValueError("GeoJSON não contém exatamente as 27 UFs.")
    return codigo_para_sigla, nomes


def validar_colunas(df: pd.DataFrame, esperadas: set[str], nome: str) -> None:
    ausentes = sorted(esperadas - set(df.columns))
    if ausentes:
        raise ValueError(f"{nome}: colunas ausentes: {ausentes}")


def agregar_ufs() -> pd.DataFrame:
    codigo_para_sigla, _ = carregar_mapa_ufs()
    municipios = pd.read_csv(
        MUNICIPIOS,
        dtype={"cod_municipio": str, "cod_ibge": str, "uf_ibge": str},
    )
    populacao = pd.read_csv(
        POPULACAO,
        dtype={"cod_municipio": str, "cod_ibge": str, "uf": str},
    )
    nacional = pd.read_csv(NACIONAL)

    validar_colunas(
        municipios,
        {
            "cod_municipio",
            "ano",
            "uf_ibge",
            "qtd_aprovada",
            "valor_aprovado",
            "valor_aprovado_real",
            "estado_registro",
        },
        MUNICIPIOS.name,
    )
    validar_colunas(
        populacao,
        {"cod_ibge", "ano", "uf", "populacao", "fonte_populacao"},
        POPULACAO.name,
    )
    validar_colunas(
        nacional,
        {"ano", "qtd_aprovada", "valor_aprovado", "ano_completo"},
        NACIONAL.name,
    )

    recorte = municipios[municipios["ano"].between(ANO_INICIO, ANO_FIM)].copy()
    if recorte.duplicated(["cod_municipio", "ano"]).any():
        raise ValueError("Base municipal tem grão duplicado município x ano.")
    estados_invalidos = set(recorte["estado_registro"].dropna()) - (
        ESTADOS_COM_NUMERO | ESTADOS_SEM_NUMERO
    )
    if estados_invalidos:
        raise ValueError(f"Estados de registro inválidos: {sorted(estados_invalidos)}")
    linhas_sem_numero = recorte["estado_registro"].isin(ESTADOS_SEM_NUMERO)
    if recorte.loc[linhas_sem_numero, ["qtd_aprovada", "valor_aprovado"]].notna().any().any():
        raise ValueError("Linha sem_registro/ausente contém medida numérica.")

    recorte["uf"] = recorte["uf_ibge"].str.zfill(2).map(codigo_para_sigla)
    if recorte["uf"].isna().any():
        faltantes = sorted(recorte.loc[recorte["uf"].isna(), "uf_ibge"].unique())
        raise ValueError(f"Código de UF municipal sem mapeamento: {faltantes}")

    medidas = (
        recorte.groupby(["uf", "ano"], as_index=False)[
            ["qtd_aprovada", "valor_aprovado", "valor_aprovado_real"]
        ]
        .sum(min_count=1)
        .rename(columns={"valor_aprovado": "valor_aprovado_nominal"})
    )

    pop_recorte = populacao[populacao["ano"].between(ANO_INICIO, ANO_FIM)].copy()
    if pop_recorte.duplicated(["cod_ibge", "ano"]).any():
        raise ValueError("Base populacional tem grão duplicado município IBGE x ano.")
    if pop_recorte["populacao"].isna().any() or (pop_recorte["populacao"] <= 0).any():
        raise ValueError("População ausente ou não positiva no recorte territorial.")
    pop_recorte["uf"] = pop_recorte["uf"].str.upper()
    populacao_uf = (
        pop_recorte.groupby(["uf", "ano"], as_index=False)["populacao"]
        .sum()
    )

    agregado = medidas.merge(
        populacao_uf,
        on=["uf", "ano"],
        how="outer",
        validate="one_to_one",
        indicator=True,
    )
    if not agregado["_merge"].eq("both").all():
        divergencias = agregado.loc[agregado["_merge"] != "both", ["uf", "ano", "_merge"]]
        raise ValueError(f"Cobertura UF x ano divergente:\n{divergencias.to_string(index=False)}")
    agregado = agregado.drop(columns="_merge")

    agregado["taxa_qtd_100k"] = agregado["qtd_aprovada"] / agregado["populacao"] * 100_000
    agregado["valor_real_per_capita"] = agregado["valor_aprovado_real"] / agregado["populacao"]
    agregado = agregado[COLUNAS_UF].sort_values(["ano", "uf"]).reset_index(drop=True)

    if len(agregado) != 27 * (ANO_FIM - ANO_INICIO + 1):
        raise ValueError(f"Esperadas 297 linhas UF x ano; obtidas {len(agregado)}.")
    if agregado.duplicated(["uf", "ano"]).any():
        raise ValueError("Saída UF contém duplicata no grão UF x ano.")
    if agregado["uf"].nunique() != 27:
        raise ValueError("Saída UF não contém exatamente 27 UFs.")

    soma_ufs = (
        agregado.groupby("ano", as_index=False)[["qtd_aprovada", "valor_aprovado_nominal"]]
        .sum()
    )
    nacional_fechado = nacional[
        nacional["ano"].between(ANO_INICIO, ANO_FIM) & nacional["ano_completo"].astype(bool)
    ][["ano", "qtd_aprovada", "valor_aprovado"]]
    reconciliacao = soma_ufs.merge(
        nacional_fechado,
        on="ano",
        how="outer",
        validate="one_to_one",
        suffixes=("_ufs", "_nacional"),
        indicator=True,
    )
    if not reconciliacao["_merge"].eq("both").all():
        raise ValueError("Anos da agregação UF não coincidem com o nacional fechado.")
    if not np.allclose(
        reconciliacao["qtd_aprovada_ufs"],
        reconciliacao["qtd_aprovada_nacional"],
        rtol=0,
        atol=0,
    ):
        raise ValueError("Soma das UFs diverge da quantidade nacional.")
    if not np.allclose(
        reconciliacao["valor_aprovado_nominal"],
        reconciliacao["valor_aprovado"],
        rtol=0,
        atol=0.01,
    ):
        raise ValueError("Soma das UFs diverge do valor nominal nacional.")

    return agregado


def classificar_faixa(variacao: pd.Series) -> pd.Series:
    condicoes = [
        variacao < -50,
        (variacao >= -50) & (variacao < -25),
        (variacao >= -25) & (variacao < 0),
        variacao == 0,
        (variacao > 0) & (variacao <= 25),
        (variacao > 25) & (variacao <= 50),
        variacao > 50,
    ]
    faixas = [
        "queda_maior_50",
        "queda_25_a_50",
        "queda_ate_25",
        "sem_variacao",
        "crescimento_ate_25",
        "crescimento_25_a_50",
        "crescimento_maior_50",
    ]
    return pd.Series(np.select(condicoes, faixas, default="invalida"), index=variacao.index)


def distribuir_trajetorias() -> pd.DataFrame:
    municipios = pd.read_csv(
        MUNICIPIOS,
        dtype={"cod_municipio": str, "cod_ibge": str, "uf_ibge": str},
    )
    pontas = municipios[municipios["ano"].isin([ANO_INICIO, ANO_FIM])][
        ["cod_municipio", "ano", "estado_registro", "valor_aprovado_real"]
    ].copy()
    if pontas.duplicated(["cod_municipio", "ano"]).any():
        raise ValueError("Pontas da trajetória duplicadas no grão município x ano.")

    inicio = pontas[pontas["ano"] == ANO_INICIO].drop(columns="ano").rename(
        columns={
            "estado_registro": "estado_inicio",
            "valor_aprovado_real": "valor_inicio",
        }
    )
    fim = pontas[pontas["ano"] == ANO_FIM].drop(columns="ano").rename(
        columns={
            "estado_registro": "estado_fim",
            "valor_aprovado_real": "valor_fim",
        }
    )
    pares = inicio.merge(fim, on="cod_municipio", how="outer", validate="one_to_one")
    pares["estado_inicio"] = pares["estado_inicio"].fillna("ausente")
    pares["estado_fim"] = pares["estado_fim"].fillna("ausente")

    inicio_valido = pares["estado_inicio"].isin(ESTADOS_COM_NUMERO) & pares["valor_inicio"].notna()
    fim_valido = pares["estado_fim"].isin(ESTADOS_COM_NUMERO) & pares["valor_fim"].notna()
    base_zero = inicio_valido & pares["valor_inicio"].eq(0)
    comparaveis = inicio_valido & fim_valido & ~base_zero
    pares.loc[comparaveis, "variacao_pct"] = (
        pares.loc[comparaveis, "valor_fim"] / pares.loc[comparaveis, "valor_inicio"] - 1
    ) * 100
    pares.loc[comparaveis, "faixa"] = classificar_faixa(pares.loc[comparaveis, "variacao_pct"])

    especificacao = [
        ("queda_maior_50", 1, None, -50.0),
        ("queda_25_a_50", 2, -50.0, -25.0),
        ("queda_ate_25", 3, -25.0, 0.0),
        ("sem_variacao", 4, 0.0, 0.0),
        ("crescimento_ate_25", 5, 0.0, 25.0),
        ("crescimento_25_a_50", 6, 25.0, 50.0),
        ("crescimento_maior_50", 7, 50.0, None),
    ]
    total_validos = int(comparaveis.sum())
    linhas: list[dict[str, object]] = []
    for faixa, ordem, limite_inferior, limite_superior in especificacao:
        quantidade = int((pares["faixa"] == faixa).sum())
        linhas.append(
            {
                "registro_tipo": "faixa_variacao",
                "faixa": faixa,
                "ordem": ordem,
                "limite_inferior_pct": limite_inferior,
                "limite_superior_pct": limite_superior,
                "municipios": quantidade,
                "percentual_validos": quantidade / total_validos * 100 if total_validos else np.nan,
                "periodo_inicio": ANO_INICIO,
                "periodo_fim": ANO_FIM,
                "metrica": "variacao_valor_aprovado_real_pct",
                "incluido_na_distribuicao": True,
                "motivo_exclusao": None,
            }
        )

    novo_registro = ~inicio_valido & fim_valido
    sem_registro_final = inicio_valido & ~fim_valido
    sem_registro_ambos = ~inicio_valido & ~fim_valido
    exclusoes = [
        (
            "novo_registro",
            novo_registro,
            "2015 sem_registro/ausente e 2025 com número: variação percentual não definida",
        ),
        (
            "sem_registro_final",
            sem_registro_final,
            "2015 com número e 2025 sem_registro/ausente: não tratar como queda de 100%",
        ),
        (
            "sem_registro_ambos",
            sem_registro_ambos,
            "2015 e 2025 sem_registro/ausente",
        ),
        (
            "excluido_base_zero",
            base_zero,
            "valor real observado em 2015 igual a zero: denominador da variação inválido",
        ),
    ]
    for deslocamento, (faixa, mascara, motivo) in enumerate(exclusoes, start=1):
        linhas.append(
            {
                "registro_tipo": "exclusao",
                "faixa": faixa,
                "ordem": 7 + deslocamento,
                "limite_inferior_pct": None,
                "limite_superior_pct": None,
                "municipios": int(mascara.sum()),
                "percentual_validos": None,
                "periodo_inicio": ANO_INICIO,
                "periodo_fim": ANO_FIM,
                "metrica": "variacao_valor_aprovado_real_pct",
                "incluido_na_distribuicao": False,
                "motivo_exclusao": motivo,
            }
        )

    excluidos_total = int((~comparaveis).sum())
    linhas.append(
        {
            "registro_tipo": "resumo_exclusao",
            "faixa": "excluido_total",
            "ordem": 12,
            "limite_inferior_pct": None,
            "limite_superior_pct": None,
            "municipios": excluidos_total,
            "percentual_validos": None,
            "periodo_inicio": ANO_INICIO,
            "periodo_fim": ANO_FIM,
            "metrica": "variacao_valor_aprovado_real_pct",
            "incluido_na_distribuicao": False,
            "motivo_exclusao": "total de municípios fora da variação por estado sem_registro/ausente ou base zero",
        }
    )

    distribuicao = pd.DataFrame(linhas, columns=COLUNAS_TRAJETORIAS)
    if int(distribuicao.loc[distribuicao["registro_tipo"] == "faixa_variacao", "municipios"].sum()) != total_validos:
        raise ValueError("Faixas de variação não fecham com municípios comparáveis.")
    detalhe_excluidos = int(distribuicao.loc[distribuicao["registro_tipo"] == "exclusao", "municipios"].sum())
    if detalhe_excluidos != excluidos_total:
        raise ValueError("Detalhamento das exclusões não fecha com o total excluído.")
    if total_validos + excluidos_total != len(pares):
        raise ValueError("Municípios válidos + excluídos não fecham com o universo.")
    if (pares.loc[~comparaveis, "variacao_pct"].notna()).any():
        raise ValueError("Variação calculada para município não comparável.")

    return distribuicao


def main() -> None:
    agregado_uf = agregar_ufs()
    trajetorias = distribuir_trajetorias()

    DATA.mkdir(parents=True, exist_ok=True)
    agregado_uf.to_csv(SAIDA_UF, index=False, encoding="utf-8-sig")
    trajetorias.to_csv(SAIDA_TRAJETORIAS, index=False, encoding="utf-8-sig")

    validos = int(
        trajetorias.loc[trajetorias["registro_tipo"] == "faixa_variacao", "municipios"].sum()
    )
    excluidos = int(
        trajetorias.loc[trajetorias["faixa"] == "excluido_total", "municipios"].iloc[0]
    )
    print(f"Agregado UF: {len(agregado_uf)} linhas, {agregado_uf['uf'].nunique()} UFs, {agregado_uf['ano'].nunique()} anos")
    print("Reconciliacao UF -> nacional: 100% em quantidade e valor nominal, 2015-2025")
    print(f"Trajetorias municipais: {validos} comparaveis; {excluidos} excluidas e reportadas")


if __name__ == "__main__":
    main()
