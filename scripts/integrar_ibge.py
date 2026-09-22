from pathlib import Path

import numpy as np
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT_DIR / "dados_brutos"
DATA_DIR = ROOT_DIR / "dados_tratados"

POP_ESTIMADA = RAW_DIR / "populacao_ibge_estimada_2015_2025.csv"
POP_CENSO_2022 = RAW_DIR / "populacao_ibge_censo_2022.csv"
IPCA_RAW = RAW_DIR / "ipca_ibge_indice_2015_2026_06.csv"

MENSAL = DATA_DIR / "dialise_mensal_brasil_total.csv"
MUNICIPIO_LONG = DATA_DIR / "municipio_dialise_brasil_long.csv"
MUNICIPIO_INDICADORES = DATA_DIR / "indicadores_municipio_brasil.csv"

MESES_PT = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "abril": 4,
    "maio": 5, "junho": 6, "julho": 7, "agosto": 8,
    "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12,
}


def ler_sidra(path, sep):
    return pd.read_csv(
        path, sep=sep, skiprows=3, dtype=str, encoding="utf-8-sig", engine="python"
    )


def numero_sidra(serie):
    return pd.to_numeric(
        serie.astype(str).str.replace(".", "", regex=False).str.replace(",", ".", regex=False),
        errors="coerce",
    )


def carregar_populacao():
    estimada = ler_sidra(POP_ESTIMADA, ";")
    estimada = estimada.rename(columns={estimada.columns[0]: "cod_ibge", estimada.columns[1]: "localidade"})
    estimada = estimada[estimada["cod_ibge"].str.fullmatch(r"\d{7}", na=False)].copy()
    anos_estimados = [col for col in estimada.columns if str(col).isdigit()]
    estimada = estimada.melt(
        id_vars=["cod_ibge", "localidade"], value_vars=anos_estimados,
        var_name="ano", value_name="populacao",
    )
    estimada["populacao"] = numero_sidra(estimada["populacao"])
    estimada["fonte_populacao"] = "IBGE - estimativa populacional"

    censo = ler_sidra(POP_CENSO_2022, ",")
    censo = censo.rename(columns={censo.columns[0]: "cod_ibge", censo.columns[1]: "localidade"})
    censo = censo[censo["cod_ibge"].str.fullmatch(r"\d{7}", na=False)].copy()
    censo = censo[["cod_ibge", "localidade", "2022"]].rename(columns={"2022": "populacao"})
    censo["ano"] = "2022"
    censo["populacao"] = numero_sidra(censo["populacao"])
    censo["fonte_populacao"] = "IBGE - Censo Demografico 2022"

    populacao = pd.concat([estimada, censo], ignore_index=True)
    populacao["ano"] = populacao["ano"].astype(int)
    populacao = populacao.dropna(subset=["populacao"])

    base_2022 = populacao[populacao["ano"] == 2022].set_index("cod_ibge")
    base_2024 = populacao[populacao["ano"] == 2024].set_index("cod_ibge")
    codigos = base_2022.index.intersection(base_2024.index)
    interpolada = pd.DataFrame({
        "cod_ibge": codigos,
        "localidade": base_2024.loc[codigos, "localidade"].values,
        "ano": 2023,
        "populacao": np.rint(
            np.sqrt(base_2022.loc[codigos, "populacao"] * base_2024.loc[codigos, "populacao"])
        ).astype(int).values,
        "fonte_populacao": "Interpolacao geometrica entre IBGE 2022 e 2024",
    })
    populacao = pd.concat([populacao, interpolada], ignore_index=True)
    populacao["populacao"] = populacao["populacao"].round().astype(int)
    populacao["cod_municipio"] = populacao["cod_ibge"].str[:6]
    populacao["uf"] = populacao["localidade"].str.extract(r"\(([A-Z]{2})\)$")
    populacao["municipio"] = populacao["localidade"].str.replace(r"\s+\([A-Z]{2}\)$", "", regex=True)
    populacao = populacao[
        ["cod_ibge", "cod_municipio", "municipio", "uf", "ano", "populacao", "fonte_populacao"]
    ].sort_values(["ano", "cod_ibge"]).reset_index(drop=True)

    if populacao.duplicated(["cod_ibge", "ano"]).any():
        raise ValueError("A populacao possui municipio e ano duplicados.")
    return populacao


def carregar_ipca():
    bruto = ler_sidra(IPCA_RAW, ";")
    bruto = bruto[bruto.iloc[:, 0].eq("1")].copy()
    if len(bruto) != 1:
        raise ValueError("A linha nacional do IPCA nao foi identificada.")
    colunas_mensais = list(bruto.columns[2:])
    ipca = bruto.melt(
        id_vars=[bruto.columns[0], bruto.columns[1]], value_vars=colunas_mensais,
        var_name="mes_texto", value_name="ipca_indice",
    )
    partes = ipca["mes_texto"].str.extract(r"^(\S+)\s+(\d{4})$")
    ipca["mes"] = partes[0].str.lower().map(MESES_PT)
    ipca["ano"] = pd.to_numeric(partes[1], errors="coerce")
    ipca["data"] = pd.to_datetime(dict(year=ipca["ano"], month=ipca["mes"], day=1))
    ipca["ipca_indice"] = numero_sidra(ipca["ipca_indice"])
    ipca = ipca[["data", "ano", "mes", "ipca_indice"]].dropna().sort_values("data")
    ipca[["ano", "mes"]] = ipca[["ano", "mes"]].astype(int)
    if ipca["data"].duplicated().any():
        raise ValueError("O IPCA possui meses duplicados.")
    esperado = pd.date_range(ipca["data"].min(), ipca["data"].max(), freq="MS")
    if not esperado.equals(pd.DatetimeIndex(ipca["data"])):
        raise ValueError("O IPCA possui meses ausentes.")
    base = float(ipca.iloc[-1]["ipca_indice"])
    ipca["fator_correcao_jun_2026"] = base / ipca["ipca_indice"]
    return ipca


def enriquecer_mensal(ipca):
    mensal = pd.read_csv(MENSAL, parse_dates=["data"])
    remover = [
        "ipca_indice", "fator_correcao_jun_2026", "valor_aprovado_real",
        "custo_medio_real",
    ]
    mensal = mensal.drop(columns=[col for col in remover if col in mensal.columns])
    mensal = mensal.merge(
        ipca[["data", "ipca_indice", "fator_correcao_jun_2026"]], on="data", how="left",
        validate="one_to_one",
    )
    if mensal["ipca_indice"].isna().any():
        raise ValueError("Existem meses da serie de dialise sem IPCA.")
    mensal["valor_aprovado_real"] = mensal["valor_aprovado"] * mensal["fator_correcao_jun_2026"]
    mensal["custo_medio_real"] = mensal["valor_aprovado_real"] / mensal["qtd_aprovada"]
    mensal.to_csv(MENSAL, index=False, encoding="utf-8-sig")
    return mensal


def enriquecer_municipios(populacao, ipca):
    fatores_anuais = (
        ipca.groupby("ano", as_index=False)["ipca_indice"].mean()
        .rename(columns={"ipca_indice": "ipca_indice_medio_ano"})
    )
    base_ipca = float(ipca.iloc[-1]["ipca_indice"])
    fatores_anuais["fator_correcao_jun_2026"] = base_ipca / fatores_anuais["ipca_indice_medio_ano"]

    municipal = pd.read_csv(MUNICIPIO_LONG, dtype={"cod_municipio": str})
    remover = [
        "cod_ibge", "populacao", "fonte_populacao", "ipca_indice_medio_ano",
        "fator_correcao_jun_2026", "valor_aprovado_real", "valor_por_habitante_real",
        "qtd_por_100_mil_habitantes",
    ]
    municipal = municipal.drop(columns=[col for col in remover if col in municipal.columns])
    municipal = municipal.merge(
        populacao[["cod_municipio", "ano", "cod_ibge", "populacao", "fonte_populacao"]],
        on=["cod_municipio", "ano"], how="left", validate="many_to_one",
    ).merge(fatores_anuais, on="ano", how="left", validate="many_to_one")
    municipal["valor_aprovado_real"] = municipal["valor_aprovado"] * municipal["fator_correcao_jun_2026"]
    municipal["valor_por_habitante_real"] = municipal["valor_aprovado_real"] / municipal["populacao"]
    municipal["qtd_por_100_mil_habitantes"] = municipal["qtd_aprovada"] / municipal["populacao"] * 100_000
    municipal.to_csv(MUNICIPIO_LONG, index=False, encoding="utf-8-sig")

    indicadores = pd.read_csv(MUNICIPIO_INDICADORES, dtype={"cod_municipio": str})
    remover_indicadores = [
        "populacao_2025", "qtd_por_100_mil_2025", "valor_real_por_habitante_2025",
        "estado_registro_2025",
        "valor_real_periodo", "valor_real_anual_medio", "valor_real_por_habitante_ano",
        "qtd_por_100_mil_ano", "populacao_acumulada_2015_2025", "anos_populacao",
        "populacao_uf_acumulada_2015_2025",
    ]
    indicadores = indicadores.drop(columns=[col for col in remover_indicadores if col in indicadores.columns])
    completos = municipal[municipal["ano"].between(2015, 2025)].copy()
    # min_count=1 em valor_aprovado_real: sem ele, um municipio com os onze
    # anos em sem_registro/ausente (existem 6 no recorte atual) somaria para
    # 0.0 em vez de NaN — reintroduzindo, aqui dentro de integrar_ibge.py, o
    # mesmo zero fabricado que a Onda 0.1 corrigiu em build_indicators().
    # populacao nunca e sem_registro (o IBGE cobre o municipio todo ano,
    # independente de ter havido procedimento de dialise), entao sua soma
    # pode seguir sem min_count.
    resumo = completos.groupby("cod_municipio", as_index=False).agg(
        valor_real_periodo=("valor_aprovado_real", lambda s: s.sum(min_count=1)),
        populacao_acumulada_2015_2025=("populacao", "sum"),
        anos_populacao=("populacao", "count"),
    )
    resumo["valor_real_anual_medio"] = resumo["valor_real_periodo"] / resumo["anos_populacao"]
    resumo["valor_real_por_habitante_ano"] = resumo["valor_real_periodo"] / resumo["populacao_acumulada_2015_2025"]
    resumo["qtd_por_100_mil_ano"] = (
        indicadores.set_index("cod_municipio")["qtd_periodo"].reindex(resumo["cod_municipio"]).values
        / resumo["populacao_acumulada_2015_2025"] * 100_000
    )
    populacao_uf = populacao[populacao["ano"].between(2015, 2025)].copy()
    populacao_uf["uf_ibge"] = populacao_uf["cod_municipio"].str[:2]
    populacao_uf = (
        populacao_uf.groupby("uf_ibge", as_index=False)["populacao"].sum()
        .rename(columns={"populacao": "populacao_uf_acumulada_2015_2025"})
    )
    ano_2025 = completos[completos["ano"] == 2025][
        ["cod_municipio", "populacao", "qtd_por_100_mil_habitantes", "valor_por_habitante_real", "estado_registro"]
    ].rename(columns={
        "populacao": "populacao_2025",
        "qtd_por_100_mil_habitantes": "qtd_por_100_mil_2025",
        "valor_por_habitante_real": "valor_real_por_habitante_2025",
        "estado_registro": "estado_registro_2025",
    })
    indicadores = indicadores.merge(
        resumo,
        on="cod_municipio", how="left", validate="one_to_one",
    ).merge(ano_2025, on="cod_municipio", how="left", validate="one_to_one")
    indicadores["uf_ibge"] = indicadores["uf_ibge"].astype(str).str.zfill(2)
    indicadores = indicadores.merge(populacao_uf, on="uf_ibge", how="left", validate="many_to_one")
    indicadores.to_csv(MUNICIPIO_INDICADORES, index=False, encoding="utf-8-sig")
    return municipal, indicadores


def main():
    populacao = carregar_populacao()
    ipca = carregar_ipca()
    mensal = enriquecer_mensal(ipca)
    municipal, indicadores = enriquecer_municipios(populacao, ipca)

    populacao.to_csv(DATA_DIR / "populacao_municipio_2015_2025.csv", index=False, encoding="utf-8-sig")
    ipca.to_csv(DATA_DIR / "ipca_mensal_2015_2026_06.csv", index=False, encoding="utf-8-sig")

    cobertura = municipal[municipal["ano"].between(2015, 2025)]["populacao"].notna().mean() * 100
    print(f"Populacao tratada: {populacao['cod_ibge'].nunique()} municipios")
    print(f"IPCA tratado: {len(ipca)} meses, {ipca['data'].min():%Y-%m} a {ipca['data'].max():%Y-%m}")
    print(f"Serie mensal enriquecida: {len(mensal)} meses")
    print(f"Cobertura populacional no recorte territorial: {cobertura:.2f}%")
    print(f"Municipios enriquecidos: {len(indicadores)}")


if __name__ == "__main__":
    main()
