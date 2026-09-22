"""Materializa o dossie canonico do DialisaSUS a partir dos CSVs tratados.

O script nao corrige observacoes provisórias, nao converte procedimentos em
pessoas e limita todas as comparacoes territoriais ao intervalo 2015-2025.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
TRATADOS = ROOT / "dados_tratados"
BRUTOS = ROOT / "dados_brutos"
DOSSIE = ROOT / "dossie"
TERRITORIO = DOSSIE / "territorio"
GEOJSON = ROOT / "src" / "data" / "brazil-states.geojson"

ARQ_MENSAL = "dados_tratados/dialise_mensal_brasil_total.csv"
ARQ_UF = "dados_tratados/dialise_uf_total_anual.csv"
ARQ_MUNICIPIO = "dados_tratados/municipio_dialise_brasil_long.csv"
ARQ_POPULACAO = "dados_tratados/populacao_municipio_2015_2025.csv"
ARQ_DISTRIBUICAO = "dados_tratados/distribuicao_trajetorias_municipais.csv"
ARQ_MODELOS = "dados_tratados/evidencia_modelos_resumo.csv"
ARQ_HORIZONTE = "dados_tratados/evidencia_modelos_horizonte.csv"
ARQ_PREVISAO = "dados_tratados/previsao_mensal_proximos_12m_corrigido.csv"

SCHEMA_VERSION = "1.0.0"
VALID_STATES = {"observado", "provisorio", "estimado", "sem_registro", "ausente"}


def numero(value: object) -> int | float:
    """Converte escalares pandas/numpy em numeros JSON finitos."""
    if pd.isna(value):
        raise ValueError("valor numerico ausente em campo que exige numero")
    result = value.item() if isinstance(value, np.generic) else value
    if isinstance(result, float):
        if not math.isfinite(result):
            raise ValueError(f"valor nao finito: {result}")
        if result.is_integer():
            return int(result)
    return result


def ler_csv(caminho_relativo: str, **kwargs: object) -> pd.DataFrame:
    return pd.read_csv(ROOT / caminho_relativo, **kwargs)


def origem(
    arquivos_csv: list[str],
    colunas: list[str],
    script: str,
    transformacao: str,
) -> dict[str, object]:
    return {
        "arquivos_csv": list(dict.fromkeys(arquivos_csv)),
        "colunas": list(dict.fromkeys(colunas)),
        "script": script,
        "transformacao": transformacao,
    }


def metadados(vintage: str, gerado_em: str) -> dict[str, str]:
    return {
        "gerado_em": gerado_em,
        "vintage": vintage,
        "schema_version": SCHEMA_VERSION,
    }


def ponto(
    periodo: str,
    valor: object | None,
    estado: str,
    unidade: str,
    rota_origem: dict[str, object],
    **extras: object,
) -> dict[str, object]:
    if estado not in VALID_STATES:
        raise ValueError(f"estado invalido: {estado}")
    valor_json = None if valor is None or pd.isna(valor) else numero(valor)
    return {
        "periodo": str(periodo),
        "valor": valor_json,
        "estado": estado,
        "unidade": unidade,
        "origem": rota_origem,
        **extras,
    }


def estado_populacao(ano: int) -> str:
    return "observado" if ano == 2022 else "estimado"


def fonte_populacao(ano: int) -> str:
    if ano == 2022:
        return "IBGE - Censo Demografico 2022"
    if ano == 2023:
        return "Interpolacao geometrica entre IBGE 2022 e estimativa 2024"
    return "IBGE - estimativa populacional"


def origem_populacao(nivel: str) -> dict[str, object]:
    colunas = ["cod_ibge", "ano", "populacao", "fonte_populacao"]
    if nivel == "uf":
        colunas = ["uf", "ano", "populacao", *colunas]
    return origem(
        [ARQ_UF, ARQ_POPULACAO] if nivel == "uf" else [ARQ_MUNICIPIO, ARQ_POPULACAO],
        colunas,
        "scripts/agregacao_territorial.py -> scripts/gerar_dossie.py",
        "denominador populacional do ano e territorio correspondentes; soma municipal apenas no nivel UF",
    )


def denominador_populacao(ano: int, valor: object, nivel: str) -> dict[str, object]:
    return {
        "valor": numero(valor),
        "estado": estado_populacao(ano),
        "unidade": "habitantes",
        "fonte": fonte_populacao(ano),
        "origem": origem_populacao(nivel),
    }


def taxa(
    periodo: str,
    valor: object | None,
    estado: str,
    unidade: str,
    rota_origem: dict[str, object],
    populacao: object | None,
    ano: int,
    nivel: str,
) -> dict[str, object]:
    sem_valor = estado in {"sem_registro", "ausente"}
    return {
        "periodo": str(periodo),
        "valor": None if sem_valor else numero(valor),
        "estado": estado,
        "unidade": unidade,
        "origem": rota_origem,
        "denominador": None if sem_valor else denominador_populacao(ano, populacao, nivel),
        "quebra_denominador": ano == 2022,
    }


def medida(valor: object, unidade: str, rota_origem: dict[str, object], estado: str = "observado") -> dict[str, object]:
    return {
        "valor": numero(valor),
        "estado": estado,
        "unidade": unidade,
        "origem": rota_origem,
    }


def valor_achado(chave: str, valor: object, unidade: str, rota_origem: dict[str, object], estado: str = "observado") -> dict[str, object]:
    return {
        "chave": chave,
        "valor": numero(valor),
        "unidade": unidade,
        "estado": estado,
        "origem": rota_origem,
    }


def escrever_json(caminho: Path, documento: dict[str, object]) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    temporario = caminho.with_suffix(caminho.suffix + ".tmp")
    temporario.write_text(
        json.dumps(documento, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    temporario.replace(caminho)


def carregar_ufs() -> list[dict[str, str]]:
    geo = json.loads(GEOJSON.read_text(encoding="utf-8"))
    ufs = [
        {
            "sigla": feature["properties"]["sigla"],
            "nome": feature["properties"]["name"],
            "codigo": str(feature["properties"]["codigo_ibg"]).zfill(2),
        }
        for feature in geo["features"]
    ]
    if len(ufs) != 27 or len({uf["sigla"] for uf in ufs}) != 27:
        raise AssertionError("GeoJSON deve conter exatamente as 27 UFs")
    return sorted(ufs, key=lambda item: item["sigla"])


def gerar_manifesto(meta: dict[str, str]) -> dict[str, object]:
    arquivos_brutos = sorted(path for path in BRUTOS.glob("*.csv") if path.is_file())
    hashes = [
        {
            "caminho": path.relative_to(ROOT).as_posix(),
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        }
        for path in arquivos_brutos
    ]
    texto_qtd = (BRUTOS / "qtd_mensal_dialise_brasil.csv").read_text(encoding="latin-1")
    procedimentos = sorted(set(re.findall(r"(?<!\d)\d{10}(?!\d)", texto_qtd.split("Período:", 1)[0])))
    if "0405050054" not in procedimentos:
        raise AssertionError("CICLODIALISE 0405050054 deve permanecer no recorte declarado")

    return {
        "tipo_documento": "manifesto",
        "metadados": meta,
        "versao_dossie": SCHEMA_VERSION,
        "extracao": {
            "data": meta["vintage"],
            "vintage": meta["vintage"],
            "arquivos": hashes,
        },
        "cobertura": {
            "temporal": "jan/2015 a jun/2026; 2026 parcial, com mai e jun provisorios",
            "territorial": "Brasil; UFs e municipios apenas em 2015-2025",
            "unidade_observacao": "procedimentos aprovados por local de atendimento",
        },
        "fontes": [
            {
                "id": "sia_sus",
                "nome": "Sistema de Informacoes Ambulatoriais do SUS",
                "tabela_ou_sistema": "Producao Ambulatorial por local de atendimento",
                "arquivos_csv": [path.relative_to(ROOT).as_posix() for path in arquivos_brutos if "populacao" not in path.name and "ipca" not in path.name],
            },
            {
                "id": "ibge_populacao",
                "nome": "Instituto Brasileiro de Geografia e Estatistica",
                "tabela_ou_sistema": "Censo 2022 e estimativas populacionais municipais",
                "arquivos_csv": [
                    "dados_brutos/populacao_ibge_censo_2022.csv",
                    "dados_brutos/populacao_ibge_estimada_2015_2025.csv",
                ],
            },
            {
                "id": "ibge_ipca",
                "nome": "Instituto Brasileiro de Geografia e Estatistica",
                "tabela_ou_sistema": "IPCA mensal",
                "arquivos_csv": ["dados_brutos/ipca_ibge_indice_2015_2026_06.csv"],
            },
        ],
        "escopo": {
            "procedimentos_sigtap": procedimentos,
            "questoes_abertas": [
                "DPAC/DPA permanece fora do recorte metodologico.",
                "0405050054 CICLODIALISE permanece dentro do recorte metodologico.",
            ],
            "ano_parcial": 2026,
        },
    }


def gerar_nacional(meta: dict[str, str]) -> dict[str, object]:
    mensal = ler_csv(ARQ_MENSAL, parse_dates=["data"])
    mensal["periodo"] = mensal["data"].dt.strftime("%Y-%m")
    completos = mensal[mensal["ano"].between(2015, 2025)].copy()
    anual = completos.groupby("ano", as_index=False).agg(
        valor_aprovado=("valor_aprovado", "sum"),
        valor_aprovado_real=("valor_aprovado_real", "sum"),
        qtd_aprovada=("qtd_aprovada", "sum"),
    )
    origem_g1 = origem(
        [ARQ_MENSAL],
        ["ano", "valor_aprovado", "valor_aprovado_real"],
        "scripts/gerar_dossie.py",
        "soma dos 12 meses por ano completo; valor real em reais de jun/2026, sem correcao adicional",
    )
    serie_g1: list[dict[str, object]] = []
    for row in anual.itertuples(index=False):
        serie_g1.extend(
            [
                ponto(str(row.ano), row.valor_aprovado, "observado", "reais_correntes", origem_g1, serie="nominal"),
                ponto(str(row.ano), row.valor_aprovado_real, "observado", "reais_jun_2026", origem_g1, serie="real"),
            ]
        )

    origem_g2 = origem(
        [ARQ_MENSAL],
        ["ano", "qtd_aprovada", "valor_aprovado_real"],
        "scripts/gerar_dossie.py",
        "medias anuais por periodo; valor real por procedimento calculado como razao entre somas",
    )
    periodos = {"pre_pandemia": (2015, 2019), "pos_pandemia": (2022, 2025)}
    agregados: dict[str, dict[str, float]] = {}
    serie_g2: list[dict[str, object]] = []
    for rotulo, (inicio, fim) in periodos.items():
        fatia = anual[anual["ano"].between(inicio, fim)]
        agregados[rotulo] = {
            "quantidade": float(fatia["qtd_aprovada"].mean()),
            "valor_real": float(fatia["valor_aprovado_real"].mean()),
            "valor_real_por_procedimento": float(fatia["valor_aprovado_real"].sum() / fatia["qtd_aprovada"].sum()),
        }
        unidades = {
            "quantidade": "procedimentos_aprovados_por_ano",
            "valor_real": "reais_jun_2026_por_ano",
            "valor_real_por_procedimento": "reais_jun_2026_por_procedimento_aprovado",
        }
        for metrica_nome, valor in agregados[rotulo].items():
            serie_g2.append(ponto(rotulo, valor, "observado", unidades[metrica_nome], origem_g2, metrica=metrica_nome))

    variacao_qtd = (agregados["pos_pandemia"]["quantidade"] / agregados["pre_pandemia"]["quantidade"] - 1) * 100
    variacao_custo = (
        agregados["pos_pandemia"]["valor_real_por_procedimento"]
        / agregados["pre_pandemia"]["valor_real_por_procedimento"]
        - 1
    ) * 100
    serie_g2.extend(
        [
            ponto("pre_pandemia_vs_pos_pandemia", variacao_qtd, "observado", "percentual", origem_g2, metrica="variacao_quantidade"),
            ponto("pre_pandemia_vs_pos_pandemia", variacao_custo, "observado", "percentual", origem_g2, metrica="variacao_valor_real_por_procedimento"),
        ]
    )

    origem_g3 = origem(
        [ARQ_MENSAL],
        ["data", "qtd_aprovada", "provisorio"],
        "scripts/gerar_dossie.py",
        "serie mensal sem interpolacao e sem ajuste automatico dos meses provisorios",
    )
    serie_g3 = [
        ponto(row.periodo, row.qtd_aprovada, "provisorio" if bool(row.provisorio) else "observado", "procedimentos_aprovados", origem_g3)
        for row in mensal.itertuples(index=False)
    ]
    variacao_real = (anual.iloc[-1]["valor_aprovado_real"] / anual.iloc[0]["valor_aprovado_real"] - 1) * 100
    total_procedimentos = mensal["qtd_aprovada"].sum()
    return {
        "tipo_documento": "nacional",
        "metadados": meta,
        "series": {
            "g1_valor_anual": serie_g1,
            "g2_medias_periodo": serie_g2,
            "g3_quantidade_mensal": serie_g3,
        },
        "achados": [
            {
                "id": "G1.achado.variacao_real",
                "texto": "A variacao do valor anual real entre 2015 e 2025 foi calculada na mesma base monetaria.",
                "valores": [valor_achado("variacao_real_2015_2025", variacao_real, "percentual", origem_g1)],
                "ressalvas": ["r.mix"],
                "periodos": {"inicio": "2015", "fim": "2025"},
            },
            {
                "id": "G2.achado.periodos",
                "texto": "A comparacao usa medias anuais de 2015-2019 e 2022-2025; 2020-2021 fica fora dos dois blocos.",
                "valores": [
                    valor_achado("variacao_quantidade", variacao_qtd, "percentual", origem_g2),
                    valor_achado("variacao_valor_real_por_procedimento", variacao_custo, "percentual", origem_g2),
                ],
                "ressalvas": ["r.procedimento_nao_pessoa", "r.mix"],
                "periodos": {"pre_pandemia": "2015-2019", "pos_pandemia": "2022-2025"},
            },
            {
                "id": "G3.achado.total_procedimentos",
                "texto": "O total mensal acumulado representa procedimentos aprovados, não pessoas distintas.",
                "valores": [valor_achado("procedimentos_acumulados", total_procedimentos, "procedimentos_aprovados", origem_g3)],
                "ressalvas": ["r.procedimento_nao_pessoa", "r.provisorio"],
                "periodos": {"inicio": mensal.iloc[0]["periodo"], "fim": mensal.iloc[-1]["periodo"]},
            },
        ],
    }


def gerar_territorio(meta: dict[str, str], ufs: list[dict[str, str]]) -> tuple[dict[str, object], list[tuple[str, dict[str, object]]]]:
    agregado = ler_csv(ARQ_UF)
    municipios = ler_csv(ARQ_MUNICIPIO, dtype={"cod_ibge": "string"})
    municipios = municipios[municipios["ano"].between(2015, 2025)].copy()
    mapa_quantidade_origem = origem(
        [ARQ_UF], ["uf", "ano", "qtd_aprovada"], "scripts/agregacao_territorial.py -> scripts/gerar_dossie.py", "soma municipal por UF e ano"
    )
    mapa_taxa_origem = origem(
        [ARQ_UF, ARQ_POPULACAO],
        ["uf", "ano", "qtd_aprovada", "populacao", "taxa_qtd_100k"],
        "scripts/agregacao_territorial.py -> scripts/gerar_dossie.py",
        "qtd_aprovada / populacao * 100000",
    )
    mapa = []
    for row in agregado.sort_values(["ano", "uf"]).itertuples(index=False):
        mapa.append(
            {
                "periodo": str(row.ano),
                "uf": row.uf,
                "quantidade": ponto(str(row.ano), row.qtd_aprovada, "observado", "procedimentos_aprovados", mapa_quantidade_origem),
                "taxa_100_mil": taxa(str(row.ano), row.taxa_qtd_100k, "observado", "procedimentos_aprovados_por_100_mil_habitantes", mapa_taxa_origem, row.populacao, int(row.ano), "uf"),
            }
        )
    taxas_2025 = agregado[agregado["ano"] == 2025]["taxa_qtd_100k"]
    origem_achado_indice = origem(
        [ARQ_UF], ["ano", "taxa_qtd_100k"], "scripts/gerar_dossie.py", "amplitude entre maior e menor taxa estadual em 2025"
    )
    indice = {
        "tipo_documento": "territorio_indice",
        "metadados": meta,
        "ano_corrente": 2025,
        "ufs": [{"sigla": uf["sigla"], "nome": uf["nome"], "rota": f"/evidencias/territorio/{uf['sigla'].lower()}/"} for uf in ufs],
        "mapa_por_ano": mapa,
        "metadados_mapa": {
            "geometria": "src/data/brazil-states.geojson",
            "classes_maximas": 5,
            "origem": origem(
                ["src/data/brazil-states.geojson"],
                ["properties.sigla", "properties.name", "properties.codigo_ibg", "geometry"],
                "scripts/gerar_dossie.py",
                "associacao direta pela sigla da UF; geometria nao altera valores estatisticos",
            ),
        },
        "achados": [
            {
                "id": "G4.achado.amplitude_uf",
                "texto": "A amplitude territorial de 2025 compara procedimentos aprovados por 100 mil habitantes entre as 27 UFs.",
                "valores": [valor_achado("amplitude_taxa_uf_2025", taxas_2025.max() - taxas_2025.min(), "procedimentos_aprovados_por_100_mil_habitantes", origem_achado_indice)],
                "ressalvas": ["r.procedimento_nao_pessoa", "r.denominador_2022", "r.populacao_2023"],
                "periodos": {"ano": "2025"},
            }
        ],
    }

    origem_valor_uf = origem(
        [ARQ_UF],
        ["uf", "ano", "valor_aprovado_nominal", "valor_aprovado_real"],
        "scripts/agregacao_territorial.py -> scripts/gerar_dossie.py",
        "soma anual dos valores municipais por UF nas series nominal e real",
    )
    origem_qtd_mun = origem(
        [ARQ_MUNICIPIO], ["cod_ibge", "ano", "qtd_aprovada", "estado_registro"], "scripts/gerar_dossie.py", "valor municipal no ano, preservando estado_registro"
    )
    origem_taxa_mun = origem(
        [ARQ_MUNICIPIO, ARQ_POPULACAO],
        ["cod_ibge", "ano", "qtd_aprovada", "populacao", "qtd_por_100_mil_habitantes", "estado_registro"],
        "scripts/gerar_dossie.py",
        "qtd_aprovada / populacao * 100000 quando ha registro; nulo em sem_registro/ausente",
    )
    origem_percapita_mun = origem(
        [ARQ_MUNICIPIO, ARQ_POPULACAO],
        ["cod_ibge", "ano", "valor_aprovado_real", "populacao", "valor_por_habitante_real", "estado_registro"],
        "scripts/gerar_dossie.py",
        "valor_aprovado_real / populacao quando ha registro; nulo em sem_registro/ausente",
    )
    documentos_uf: list[tuple[str, dict[str, object]]] = []
    for uf in ufs:
        fatia_uf = agregado[agregado["uf"] == uf["sigla"]].sort_values("ano")
        fatia_mun = municipios[municipios["uf_ibge"].astype(str).str.zfill(2) == uf["codigo"]].sort_values(["ano", "cod_ibge"])
        serie_valor: list[dict[str, object]] = []
        for row in fatia_uf.itertuples(index=False):
            serie_valor.extend(
                [
                    ponto(str(row.ano), row.valor_aprovado_nominal, "observado", "reais_correntes", origem_valor_uf, serie="nominal"),
                    ponto(str(row.ano), row.valor_aprovado_real, "observado", "reais_jun_2026", origem_valor_uf, serie="real"),
                ]
            )
        pontos_municipais = []
        for row in fatia_mun.itertuples(index=False):
            estado = str(row.estado_registro)
            sem_valor = estado in {"sem_registro", "ausente"}
            pontos_municipais.append(
                {
                    "periodo": str(row.ano),
                    "cod_ibge": str(row.cod_ibge).zfill(7),
                    "nome": str(row.municipio),
                    "quantidade": ponto(str(row.ano), None if sem_valor else row.qtd_aprovada, estado, "procedimentos_aprovados", origem_qtd_mun),
                    "taxa_100_mil": taxa(str(row.ano), None if sem_valor else row.qtd_por_100_mil_habitantes, estado, "procedimentos_aprovados_por_100_mil_habitantes", origem_taxa_mun, None if sem_valor else row.populacao, int(row.ano), "municipio"),
                    "valor_real_por_habitante": taxa(str(row.ano), None if sem_valor else row.valor_por_habitante_real, estado, "reais_jun_2026_por_habitante", origem_percapita_mun, None if sem_valor else row.populacao, int(row.ano), "municipio"),
                }
            )
        inicio = fatia_uf.iloc[0]["valor_aprovado_real"]
        fim = fatia_uf.iloc[-1]["valor_aprovado_real"]
        variacao = (fim / inicio - 1) * 100
        documento = {
            "tipo_documento": "territorio_uf",
            "metadados": meta,
            "uf": {"sigla": uf["sigla"], "nome": uf["nome"]},
            "serie_valor_anual": serie_valor,
            "municipios_por_ano": pontos_municipais,
            "achados": [
                {
                    "id": "G5.achado.variacao_real_uf",
                    "texto": "A variacao estadual real compara 2015 e 2025 na mesma base monetaria.",
                    "valores": [valor_achado("variacao_real_2015_2025", variacao, "percentual", origem_valor_uf)],
                    "ressalvas": ["r.atendimento", "r.sem_registro", "r.mix"],
                    "periodos": {"inicio": "2015", "fim": "2025"},
                }
            ],
        }
        documentos_uf.append((uf["sigla"], documento))
    return indice, documentos_uf


def gerar_distribuicao(meta: dict[str, str]) -> dict[str, object]:
    distribuicao = ler_csv(ARQ_DISTRIBUICAO)
    municipios = ler_csv(ARQ_MUNICIPIO)
    origem_traj = origem(
        [ARQ_DISTRIBUICAO, ARQ_MUNICIPIO],
        ["registro_tipo", "faixa", "municipios", "periodo_inicio", "periodo_fim", "estado_registro", "valor_aprovado_real"],
        "scripts/agregacao_territorial.py -> scripts/gerar_dossie.py",
        "variacao percentual 2015-2025 apenas com valores presentes nos dois extremos; agregacao das faixas em categorias narrativas",
    )
    faixas = distribuicao[distribuicao["registro_tipo"] == "faixa_variacao"].set_index("faixa")["municipios"]
    exclusoes = distribuicao[distribuicao["registro_tipo"] == "exclusao"].set_index("faixa")["municipios"]
    categorias = {
        "queda": faixas[["queda_maior_50", "queda_25_a_50", "queda_ate_25"]].sum(),
        "crescimento": faixas[["crescimento_ate_25", "crescimento_25_a_50", "crescimento_maior_50"]].sum(),
        "estavel": faixas["sem_variacao"],
        "novo_registro": exclusoes["novo_registro"],
        "sem_registro_final": exclusoes["sem_registro_final"],
        "excluido": exclusoes[["sem_registro_ambos", "excluido_base_zero"]].sum(),
    }
    trajetorias = [
        {"categoria": categoria, "municipios": medida(valor, "municipios", origem_traj)}
        for categoria, valor in categorias.items()
    ]

    taxas_2025 = municipios[(municipios["ano"] == 2025) & (municipios["estado_registro"] == "observado")]["qtd_por_100_mil_habitantes"].dropna()
    mediana = taxas_2025.median()
    estatisticas = {
        "p25": taxas_2025.quantile(0.25),
        "mediana": mediana,
        "p75": taxas_2025.quantile(0.75),
        "maximo": taxas_2025.max(),
        "acima_3x_mediana": (taxas_2025 > 3 * mediana).sum(),
    }
    origem_estatistica = origem(
        [ARQ_MUNICIPIO, ARQ_POPULACAO],
        ["ano", "estado_registro", "qtd_por_100_mil_habitantes", "qtd_aprovada", "populacao"],
        "scripts/gerar_dossie.py",
        "estatisticas entre municipios com taxa observada em 2025; acima_3x_mediana e contagem, demais chaves sao taxas",
    )
    procedencia = {
        "fonte": "IBGE - estimativa populacional municipal 2025",
        "regra": "cada taxa municipal usa a populacao do proprio municipio no mesmo ano; nenhum denominador e agregado entre municipios",
        "origem": origem_populacao("municipio"),
    }
    estatisticas_taxa = [
        {
            "chave": chave,
            "periodo": "2025",
            "valor": numero(valor),
            "estado": "observado",
            "unidade": "municipios" if chave == "acima_3x_mediana" else "procedimentos_aprovados_por_100_mil_habitantes",
            "origem": origem_estatistica,
            "procedencia_denominadores": procedencia,
        }
        for chave, valor in estatisticas.items()
    ]
    validos = sum(numero(faixas[item]) for item in faixas.index)
    excluidos = numero(distribuicao.loc[distribuicao["registro_tipo"] == "resumo_exclusao", "municipios"].iloc[0])
    return {
        "tipo_documento": "territorio_distribuicao",
        "metadados": meta,
        "periodos": {"inicio": 2015, "fim": 2025},
        "trajetorias": trajetorias,
        "estatisticas_taxa": estatisticas_taxa,
        "achados": [
            {
                "id": "G7.achado.elegibilidade",
                "texto": "A distribuicao de variacoes usa somente municipios com valor real registrado em 2015 e 2025; as exclusoes permanecem contabilizadas.",
                "valores": [
                    valor_achado("municipios_comparaveis", validos, "municipios", origem_traj),
                    valor_achado("municipios_excluidos", excluidos, "municipios", origem_traj),
                ],
                "ressalvas": ["r.sem_registro", "r.atendimento"],
                "periodos": {"inicio": "2015", "fim": "2025"},
            },
            {
                "id": "G7.achado.extremos_taxa",
                "texto": "Os extremos municipais de 2025 usam taxas por 100 mil com denominador municipal do mesmo ano.",
                "valores": [
                    valor_achado("mediana_taxa_2025", mediana, "procedimentos_aprovados_por_100_mil_habitantes", origem_estatistica),
                    valor_achado("municipios_acima_3x_mediana", estatisticas["acima_3x_mediana"], "municipios", origem_estatistica),
                ],
                "ressalvas": ["r.procedimento_nao_pessoa", "r.sem_registro"],
                "periodos": {"ano": "2025"},
            },
        ],
    }


def gerar_modelo(meta: dict[str, str]) -> dict[str, object]:
    resumo = ler_csv(ARQ_MODELOS)
    horizonte = ler_csv(ARQ_HORIZONTE)
    previsao = ler_csv(ARQ_PREVISAO, parse_dates=["data"])
    origem_resumo = origem(
        [ARQ_MODELOS],
        ["alvo", "escala", "modelo", "MAPE_pct", "MAPE_mediana_pct", "MASE", "vies_pct", "recortes"],
        "scripts/modelagem_preditiva.py -> scripts/gerar_dossie.py",
        "transcricao das metricas de backtest temporal por alvo e modelo; sem reestimacao",
    )
    comparacao = []
    for row in resumo.itertuples(index=False):
        alvo = "valor_nominal" if row.escala == "nominal" else "valor_real"
        comparacao.append(
            {
                "modelo": row.modelo,
                "alvo": alvo,
                "janelas": numero(row.recortes),
                "metricas": {
                    "mape_medio": medida(row.MAPE_pct, "percentual", origem_resumo),
                    "mape_mediano": medida(row.MAPE_mediana_pct, "percentual", origem_resumo),
                    "mase": medida(row.MASE, "razao", origem_resumo),
                    "vies": medida(row.vies_pct, "percentual", origem_resumo),
                },
            }
        )
    origem_horizonte = origem(
        [ARQ_HORIZONTE],
        ["alvo", "escala", "modelo", "horizonte", "vies_pct"],
        "scripts/modelagem_preditiva.py -> scripts/gerar_dossie.py",
        "vies percentual de cada modelo e alvo em cada horizonte do backtest temporal",
    )
    vies_horizonte = [
        ponto(
            str(row.horizonte),
            row.vies_pct,
            "observado",
            "percentual",
            origem_horizonte,
            modelo=row.modelo,
            alvo="valor_nominal" if row.escala == "nominal" else "valor_real",
            horizonte_meses=int(row.horizonte),
        )
        for row in horizonte.itertuples(index=False)
    ]
    origem_previsao = origem(
        [ARQ_PREVISAO],
        ["data", "previsao_valor_aprovado", "limite_inferior_95", "limite_superior_95", "modelo_usado"],
        "scripts/modelagem_preditiva.py -> scripts/gerar_dossie.py",
        "previsao mensal nominal e limites de 95%; meses provisorios da origem sao mantidos sem correcao automatica",
    )
    previsao_12m = []
    for row in previsao.itertuples(index=False):
        periodo = row.data.strftime("%Y-%m")
        previsao_12m.append(
            {
                "periodo": periodo,
                "modelo": row.modelo_usado,
                "central": ponto(periodo, row.previsao_valor_aprovado, "estimado", "reais_correntes", origem_previsao),
                "limite_inferior_95": ponto(periodo, row.limite_inferior_95, "estimado", "reais_correntes", origem_previsao),
                "limite_superior_95": ponto(periodo, row.limite_superior_95, "estimado", "reais_correntes", origem_previsao),
            }
        )
    mensal = ler_csv(ARQ_MENSAL, parse_dates=["data"])
    origem_previsao_data = mensal["data"].max().strftime("%Y-%m")
    nominal = resumo[resumo["escala"] == "nominal"].sort_values("MAPE_pct")
    real = resumo[resumo["escala"] == "real_jun_2026"].sort_values("MAPE_pct")
    return {
        "tipo_documento": "modelo",
        "metadados": meta,
        "protocolo": {
            "frequencia": "mensal",
            "horizonte_meses": 12,
            "baseline": "sazonal_ingenuo",
            "origem_previsao": origem_previsao_data,
            "meses_provisorios_na_origem": bool(mensal.loc[mensal["data"] == mensal["data"].max(), "provisorio"].iloc[0]),
        },
        "comparacao_modelos": comparacao,
        "vies_por_horizonte": vies_horizonte,
        "previsao_12m": previsao_12m,
        "achados": [
            {
                "id": "G6.achado.modelo_nominal",
                "texto": "No alvo nominal, o menor MAPE medio pertence ao primeiro colocado do backtest; a escolha operacional permanece separada da decisao metodologica da autora e do orientador.",
                "valores": [valor_achado("menor_mape_nominal", nominal.iloc[0]["MAPE_pct"], "percentual", origem_resumo)],
                "ressalvas": ["r.mape", "r.provisorio"],
                "periodos": {"backtest": "janelas temporais mensais", "origem_previsao": origem_previsao_data},
            },
            {
                "id": "G6.achado.modelo_real",
                "texto": "No alvo real, o menor MAPE medio pertence ao primeiro colocado do backtest em reais de jun/2026.",
                "valores": [valor_achado("menor_mape_real", real.iloc[0]["MAPE_pct"], "percentual", origem_resumo)],
                "ressalvas": ["r.mape", "r.mix"],
                "periodos": {"backtest": "janelas temporais mensais"},
            },
        ],
    }


def descobrir_vintage() -> str:
    vintages = sorted(path.name for path in (BRUTOS / "vintages").glob("????-??-??") if path.is_dir())
    if not vintages:
        raise FileNotFoundError("nenhum vintage em dados_brutos/vintages")
    return vintages[-1]


def main() -> None:
    vintage = descobrir_vintage()
    gerado_em = datetime.now(ZoneInfo("America/Sao_Paulo")).isoformat(timespec="seconds")
    meta = metadados(vintage, gerado_em)
    ufs = carregar_ufs()

    escrever_json(DOSSIE / "manifesto.json", gerar_manifesto(meta))
    escrever_json(DOSSIE / "nacional.json", gerar_nacional(meta))
    escrever_json(DOSSIE / "modelo.json", gerar_modelo(meta))
    indice, documentos_uf = gerar_territorio(meta, ufs)
    escrever_json(TERRITORIO / "indice.json", indice)
    escrever_json(TERRITORIO / "distribuicao.json", gerar_distribuicao(meta))
    for sigla, documento in documentos_uf:
        escrever_json(TERRITORIO / f"uf-{sigla}.json", documento)

    arquivos = sorted(path for path in DOSSIE.rglob("*.json") if path.name != "schema.json")
    if len(arquivos) != 34:
        raise AssertionError(f"esperados 34 documentos canonicos; encontrados {len(arquivos)}")
    print(f"Dossie materializado: {len(arquivos)} documentos, incluindo 27 UFs")


if __name__ == "__main__":
    main()
