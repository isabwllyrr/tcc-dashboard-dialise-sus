# Modelagem preditiva

Serie mensal nacional de 2015-01 a 2026-06.
Validacao temporal com 43 janelas moveis de 12 meses.
Em cada janela, o modelo usa somente observacoes anteriores ao teste e projeta os 12 meses sem acessar valores reais intermediarios.
Evidencia comparativa: Regressao Linear, Ridge, Random Forest, Gradient Boosting e Holt-Winters aditivo (tendencia e sazonalidade, periodo 12).
As entradas representam tendencia temporal e sazonalidade mensal (mes, seno e cosseno do mes).
O MASE usa como escala o erro sazonal ingenuo de 12 meses calculado somente dentro de cada treino.
A faixa empirica de 95% usa o percentil 95 do erro absoluto de backtesting, separado por horizonte; ela nao e derivada do MAPE.

## Primeiro: alvo nominal

| modelo | tipo | MAPE medio | MAPE mediano | MASE | vies | janelas | ajustes sem convergencia |
| --- | --- | --- | --- | --- | --- | --- | --- |
| holt_winters | baseline | 4.44% | 3.51% | 1.02 | -0.89% | 43 | 2 |
| gradient_boosting | aprendizagem | 5.35% | 4.42% | 1.23 | -4.98% | 43 | 0 |
| random_forest | aprendizagem | 6.74% | 5.37% | 1.56 | -6.32% | 43 | 0 |
| regressao_linear | aprendizagem | 8.46% | 7.64% | 1.90 | -8.44% | 43 | 0 |
| ridge | aprendizagem | 10.01% | 9.41% | 2.24 | -10.11% | 43 | 0 |

No alvo nominal, o Gradient Boosting perde nominalmente para o Holt-Winters.

## Depois: alvo real

| modelo | tipo | MAPE medio | MAPE mediano | MASE | vies | janelas | ajustes sem convergencia |
| --- | --- | --- | --- | --- | --- | --- | --- |
| gradient_boosting | aprendizagem | 3.92% | 3.31% | 0.98 | -2.81% | 43 | 0 |
| random_forest | aprendizagem | 4.56% | 4.03% | 1.13 | -2.77% | 43 | 0 |
| holt_winters | baseline | 4.59% | 3.92% | 1.13 | -0.58% | 43 | 1 |
| regressao_linear | aprendizagem | 5.70% | 5.12% | 1.41 | -4.70% | 43 | 0 |
| ridge | aprendizagem | 5.79% | 5.36% | 1.43 | -4.86% | 43 | 0 |

No alvo real, o Gradient Boosting e comparado sem a tendencia inflacionaria embutida no alvo.

Modelo oficial preservado por gate academico: `gradient_boosting`.
O script nao promove automaticamente o vencedor da tabela comparativa.

MAPE e erro medio, nao intervalo de confianca: 5,35% nao significa 94,65% de certeza.
A projecao e exploratoria e nao determina o gasto futuro. Choques de politica, tabela SUS, demanda ou capacidade assistencial podem alterar os valores.
