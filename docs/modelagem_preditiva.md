# Modelagem preditiva inicial

A serie mensal de valor aprovado foi dividida em treino (2015 a 2021) e teste (2022 a 2023).
Foram avaliados tres modelos simples e transparentes: media movel de 12 meses, sazonal ingenuo de 12 meses e tendencia linear.

## Metricas no periodo de teste

| modelo | MAE | RMSE | MAPE_pct |
| --- | --- | --- | --- |
| media_movel_12m | 23539136.12 | 25995148.84 | 7.15% |
| tendencia_linear | 30133680.79 | 35264767.11 | 8.94% |
| sazonal_ingenuo_12m | 35435230.66 | 37872700.35 | 10.86% |

Modelo selecionado pelo menor MAPE: `media_movel_12m`.

## Observacao metodologica

Esta e uma modelagem inicial. Para a versao final do TCC, as previsoes devem ser discutidas como apoio exploratorio a gestao, nao como determinacao exata do gasto futuro.
