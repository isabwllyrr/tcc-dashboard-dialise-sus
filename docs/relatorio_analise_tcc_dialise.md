# Analise inicial - custo da dialise no SUS

Tema: analise preditiva do custo da dialise no SUS, com dados do SIA/SUS para o Ceara.

## O que os arquivos trazem

- `sia_cnv_qace094212177_19_126_92.csv`: valor aprovado por ano/mes de atendimento. Serve para serie temporal mensal/anual geral.
- `sia_cnv_qace094359177_19_126_92.csv`: quantidade aprovada por municipio e ano de processamento. Serve para analise territorial, mas ainda nao esta filtrada por dialise.
- `sia_cnv_qace094828177_19_126_92.csv`: valor aprovado por procedimento e ano de processamento. Este e o arquivo mais importante para isolar procedimentos de dialise.

## Pontos fortes do notebook atual

- Usa `pandas`, que e adequado para limpar e transformar dados do TabNet.
- Ja identifica colunas de ano automaticamente.
- Ja extrai codigo e nome de municipio/procedimento.
- Ja tenta criar uma visao anual unificada, que e uma boa base para graficos e modelagem.

## Correcoes importantes

1. Remover rodapes do TabNet antes da modelagem.

Os CSVs trazem linhas como `Total`, `Fonte`, `Notas` e textos explicativos. No arquivo mensal, isso pode entrar como se fosse linha anual. O ideal e manter apenas linhas que tenham ano valido:

```python
df["ano"] = df["ano_mes"].astype(str).str.extract(r"(\d{4})").astype("Int64")
df = df[df["ano"].notna()].copy()
```

2. Filtrar procedimentos de dialise antes de calcular custo.

O arquivo por procedimento contem todos os procedimentos ambulatoriais, nao apenas dialise. Usar o total geral como custo de dialise distorce o estudo. Um filtro inicial mais seguro e:

```python
padrao = (
    r"HEMODIALISE|DIALISE PERITONEAL|DIALISE|"
    r"P/HEMODIALISE|P/ HEMODIALISE|SESSAO DE HEMODIALISE"
)
df_dialise = df_proc[
    df_proc["nome_procedimento"].str.contains(padrao, case=False, na=False, regex=True)
].copy()
```

3. Evitar filtro amplo por `RENAL`.

Termos como `RENAL` capturam exames, litotripsia e outros procedimentos que nao sao necessariamente dialise. Isso gera falso positivo.

## Resultado inicial encontrado

Com filtro estrito de dialise, aparecem 14 procedimentos relacionados. O maior custo vem de:

- `0305010107` - Hemodialise, maximo 3 sessoes por semana.
- `0305010115` - Hemodialise em paciente com sorologia positiva para HIV/hepatites.
- `0305010093` - Hemodialise, maximo 1 sessao por semana, excepcionalidade.

Resumo anual do custo filtrado de dialise:

| Ano | Valor dialise |
|---:|---:|
| 2015 | R$ 112.826.095,96 |
| 2016 | R$ 119.094.237,40 |
| 2017 | R$ 132.991.951,45 |
| 2018 | R$ 137.957.520,74 |
| 2019 | R$ 144.749.902,81 |
| 2020 | R$ 150.406.449,68 |
| 2021 | R$ 153.385.349,12 |
| 2022 | R$ 181.824.756,61 |
| 2023 | R$ 208.005.541,08 |

Entre 2015 e 2023, o custo filtrado de dialise cresceu de aproximadamente R$ 112,8 milhoes para R$ 208,0 milhoes.

## Como transformar em analise preditiva

Com apenas 9 pontos anuais, modelos complexos como Random Forest, XGBoost ou redes neurais nao sao recomendados ainda. O melhor para o TCC, com esses arquivos, e apresentar modelos simples e transparentes:

- Tendencia linear anual.
- Crescimento historico medio, via CAGR.
- Media movel ou suavizacao exponencial, se houver serie mensal especifica de dialise.

Para uma predicao mais forte, o ideal e baixar no TabNet uma serie mensal ja filtrada por procedimento de dialise. Assim a base teria cerca de 108 meses entre 2015 e 2023, em vez de apenas 9 anos.

## Proximos dados recomendados

Para melhorar o trabalho, vale coletar:

- Valor aprovado por mes filtrado para procedimentos de dialise.
- Quantidade aprovada por mes/procedimento de dialise.
- Valor e quantidade por municipio filtrados por dialise.
- Populacao municipal ou regional, para calcular custo por habitante.
- Indicadores de envelhecimento populacional, diabetes e hipertensao, se o objetivo incluir variaveis explicativas.

## Arquivos gerados pelo script corrigido

- `resultado_dialise_anual.csv`: resumo anual com custo de dialise, total ambulatorial e participacao percentual.
- `procedimentos_dialise_filtrados.csv`: lista dos procedimentos filtrados como dialise.
- `previsao_dialise_2024_2026.csv`: previsoes-base com tendencia linear e CAGR.

