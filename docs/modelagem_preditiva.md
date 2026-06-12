# Modelagem preditiva inicial

A serie mensal de valor aprovado cobre 2015-01 a 2026-04.
A divisao inicial usa treino de 2015 a 2021 e teste de 2022 ate o ultimo mes disponivel.
Foram avaliados tres modelos simples e transparentes: media movel de 12 meses, sazonal ingenuo de 12 meses e tendencia linear.

## Metricas no periodo de teste

| modelo | MAE | RMSE | MAPE_pct |
| --- | --- | --- | --- |
| media_movel_12m | 19485963.30 | 22180207.78 | 5.52% |
| sazonal_ingenuo_12m | 29828531.24 | 34306178.46 | 8.52% |
| tendencia_linear | 50928000.60 | 56698588.19 | 13.62% |

Modelo selecionado pelo menor MAPE: `media_movel_12m`.

## Observacao metodologica

Esta e uma modelagem inicial. Para a versao final do TCC, as previsoes devem ser discutidas como apoio exploratorio a gestao, nao como determinacao exata do gasto futuro.
