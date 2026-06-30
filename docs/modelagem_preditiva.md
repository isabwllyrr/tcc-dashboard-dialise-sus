# Modelagem preditiva

A serie mensal de valor aprovado cobre 2015-01 a 2026-04.
A validacao principal usa backtesting temporal com multiplos recortes anuais de 12 meses.
Tambem foi mantido um holdout de 2022 ate o ultimo mes disponivel para comparacao historica.
Foram avaliados baselines estatisticos e modelos supervisionados de aprendizagem de maquina.
Os modelos de aprendizagem usam variaveis temporais, defasagens do valor aprovado, medias moveis, quantidade aprovada e custo medio defasado.
No dashboard, a comparacao resumida prioriza apenas os modelos de aprendizagem, conforme o recorte metodologico do TCC.

## Metricas do backtesting temporal

| modelo | tipo | MAE medio | RMSE medio | MAPE medio | desvio MAPE | recortes |
| --- | --- | --- | --- | --- | --- | --- |
| ridge | aprendizagem | 7986589.49 | 9992251.33 | 2.54% | 0.70% | 7 |
| regressao_linear | aprendizagem | 11570988.08 | 13290974.07 | 3.80% | 2.43% | 7 |
| media_movel_12m | baseline | 14457481.64 | 16386373.83 | 4.40% | 2.11% | 7 |
| gradient_boosting | aprendizagem | 16983339.76 | 19111311.14 | 5.23% | 4.75% | 7 |
| random_forest | aprendizagem | 17776930.90 | 20198336.62 | 5.40% | 3.98% | 7 |
| tendencia_linear | baseline | 21658209.80 | 24013798.44 | 6.44% | 2.96% | 7 |
| sazonal_ingenuo_12m | baseline | 21547981.46 | 23765075.18 | 6.52% | 4.14% | 7 |

Modelo selecionado pelo menor MAPE medio no backtesting temporal: `ridge`.

## Holdout 2022 ate o ultimo mes disponivel

| modelo | tipo | MAE | RMSE | MAPE_pct |
| --- | --- | --- | --- | --- |
| ridge | aprendizagem | 12571232.74 | 14662822.59 | 3.51% |
| media_movel_12m | baseline | 19485963.30 | 22180207.78 | 5.52% |
| sazonal_ingenuo_12m | baseline | 29828531.24 | 34306178.46 | 8.52% |
| tendencia_linear | baseline | 50928000.60 | 56698588.19 | 13.62% |
| regressao_linear | aprendizagem | 51440457.45 | 56264965.49 | 13.91% |
| random_forest | aprendizagem | 86644483.40 | 93908213.53 | 23.34% |
| gradient_boosting | aprendizagem | 94293470.75 | 101025079.11 | 25.50% |

## Observacao metodologica

As previsoes devem ser discutidas como apoio exploratorio a gestao, nao como determinacao exata do gasto futuro. A unidade de analise do projeto sao procedimentos aprovados no SIA/SUS, nao pacientes unicos.
