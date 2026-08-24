# Modelagem preditiva

A serie mensal de valor aprovado cobre 2015-01 a 2026-06.
A validacao principal usa backtesting temporal mensal a partir de 2022-01 ate o ultimo mes disponivel.
Foram avaliados modelos supervisionados de aprendizagem de maquina.
Os modelos de aprendizagem usam variaveis temporais, defasagens do valor aprovado, medias moveis, quantidade aprovada e custo medio defasado.
No dashboard, a comparacao resumida prioriza apenas os modelos de aprendizagem, conforme o recorte metodologico do TCC.

## Metricas do backtesting temporal

| modelo | tipo | MAE medio | RMSE medio | MAPE medio | desvio MAPE | recortes |
| --- | --- | --- | --- | --- | --- | --- |
| gradient_boosting | aprendizagem | 11845194.68 | 14239930.79 | 3.27% | - | 54 |
| random_forest | aprendizagem | 14702489.08 | 17365968.80 | 4.10% | - | 54 |
| regressao_linear | aprendizagem | 24931318.65 | 28346684.32 | 6.80% | - | 54 |
| ridge | aprendizagem | 27588773.06 | 30947220.33 | 7.52% | - | 54 |

Modelo selecionado pelo menor MAPE medio no backtesting temporal: `gradient_boosting`.

## Previsao gerada

A previsao exploratoria atual cobre julho de 2026 a junho de 2027 e utiliza o modelo `gradient_boosting`, selecionado apos a atualizacao da base ate junho de 2026.

## Observacao metodologica

As previsoes devem ser discutidas como apoio exploratorio a gestao, nao como determinacao exata do gasto futuro. A unidade de analise do projeto sao procedimentos aprovados no SIA/SUS, nao pacientes unicos.
