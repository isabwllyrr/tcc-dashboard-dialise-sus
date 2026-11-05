# Modelagem preditiva

Serie mensal nacional de 2015-01 a 2026-06.
Validacao temporal com 43 janelas moveis de 12 meses.
Em cada janela, o modelo usa somente observacoes anteriores ao teste e projeta os 12 meses sem acessar valores reais intermediarios.
Evidencia comparativa: sazonal ingenuo, Holt-Winters aditivo, Holt-Winters log-aditivo, Regressao Linear, Ridge, Random Forest e Gradient Boosting.
Os modelos supervisionados usam tendencia temporal e sazonalidade mensal (mes, seno e cosseno do mes).
O MASE usa como escala o erro sazonal ingenuo de 12 meses calculado somente dentro de cada treino; o benchmark tambem e avaliado explicitamente no teste.
A faixa empirica de 95% usa o percentil 95 do erro absoluto de backtesting, separado por horizonte; ela nao e derivada do MAPE.

## Primeiro: alvo nominal

| modelo | tipo | MAPE medio | MAPE mediano | MASE | vies | janelas | ajustes sem convergencia |
| --- | --- | --- | --- | --- | --- | --- | --- |
| holt_winters_log | estatistico | 3.56% | 2.35% | 0.82 | -1.40% | 43 | 0 |
| holt_winters | estatistico | 4.44% | 3.51% | 1.02 | -0.89% | 43 | 2 |
| gradient_boosting | aprendizagem | 5.35% | 4.42% | 1.23 | -4.98% | 43 | 0 |
| random_forest | aprendizagem | 6.74% | 5.37% | 1.56 | -6.32% | 43 | 0 |
| sazonal_ingenuo | baseline | 8.45% | 8.83% | 1.94 | -8.50% | 43 | 0 |
| regressao_linear | aprendizagem | 8.46% | 7.64% | 1.90 | -8.44% | 43 | 0 |
| ridge | aprendizagem | 10.01% | 9.41% | 2.24 | -10.11% | 43 | 0 |

No alvo nominal, o modelo selecionado por menor MAPE medio e `holt_winters_log`.

## Depois: alvo real

| modelo | tipo | MAPE medio | MAPE mediano | MASE | vies | janelas | ajustes sem convergencia |
| --- | --- | --- | --- | --- | --- | --- | --- |
| gradient_boosting | aprendizagem | 3.92% | 3.31% | 0.98 | -2.81% | 43 | 0 |
| holt_winters_log | estatistico | 4.01% | 2.54% | 0.99 | -1.60% | 43 | 0 |
| random_forest | aprendizagem | 4.56% | 4.03% | 1.13 | -2.77% | 43 | 0 |
| holt_winters | estatistico | 4.61% | 3.92% | 1.13 | -0.66% | 43 | 3 |
| sazonal_ingenuo | baseline | 4.88% | 4.73% | 1.22 | -3.77% | 43 | 0 |
| regressao_linear | aprendizagem | 5.70% | 5.12% | 1.41 | -4.70% | 43 | 0 |
| ridge | aprendizagem | 5.79% | 5.36% | 1.43 | -4.86% | 43 | 0 |

No alvo real, o Gradient Boosting e comparado sem a tendencia inflacionaria embutida no alvo.

Modelo oficial selecionado pelo desempenho nominal: `holt_winters_log`.
O Gradient Boosting permanece como comparacao de aprendizagem de maquina.

MAPE e erro medio, nao intervalo de confianca: 3,56% nao significa 96,44% de certeza.
A projecao e exploratoria e nao determina o gasto futuro. Choques de politica, tabela SUS, demanda ou capacidade assistencial podem alterar os valores.
