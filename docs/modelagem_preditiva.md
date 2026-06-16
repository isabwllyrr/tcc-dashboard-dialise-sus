# Modelagem preditiva inicial

A serie mensal de valor aprovado cobre 2015-01 a 2026-04.
A divisao inicial usa treino de 2015 a 2021 e teste de 2022 ate o ultimo mes disponivel.
Foram avaliados baselines estatisticos e modelos supervisionados de aprendizagem de maquina.
Os modelos de aprendizagem usam variaveis temporais, defasagens do valor aprovado, medias moveis, quantidade aprovada e custo medio defasado.

## Metricas no periodo de teste

| modelo | tipo | MAE | RMSE | MAPE_pct |
| --- | --- | --- | --- | --- |
| ridge | aprendizagem | 12571232.74 | 14662822.59 | 3.51% |
| media_movel_12m | baseline | 19485963.30 | 22180207.78 | 5.52% |
| sazonal_ingenuo_12m | baseline | 29828531.24 | 34306178.46 | 8.52% |
| tendencia_linear | baseline | 50928000.60 | 56698588.19 | 13.62% |
| regressao_linear | aprendizagem | 51440457.45 | 56264965.49 | 13.91% |
| random_forest | aprendizagem | 86644483.40 | 93908213.53 | 23.34% |
| gradient_boosting | aprendizagem | 94293470.75 | 101025079.11 | 25.50% |

Modelo selecionado pelo menor MAPE: `ridge`.

## Observacao metodologica

Esta e uma modelagem inicial. Para a versao final do TCC, as previsoes devem ser discutidas como apoio exploratorio a gestao, nao como determinacao exata do gasto futuro.
