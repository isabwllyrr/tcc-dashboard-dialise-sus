# Modelagem preditiva

Serie mensal nacional de 2015-01 a 2026-06.
Validacao temporal com 43 janelas moveis de 12 meses.
Em cada janela, o modelo usa somente observacoes anteriores ao teste e projeta os 12 meses sem acessar valores reais intermediarios.
Foram comparados apenas modelos supervisionados: Regressao Linear, Ridge, Random Forest e Gradient Boosting.
As entradas representam tendencia temporal e sazonalidade mensal (mes, seno e cosseno do mes).
A faixa empirica de 95% usa o percentil 95 do erro absoluto de backtesting, separado por horizonte.

| modelo | MAPE medio | desvio MAPE | MAPE mediano | vies | janelas |
| --- | --- | --- | --- | --- | --- |
| gradient_boosting | 5.35% | 2.82% | 4.42% | -4.98% | 43 |
| random_forest | 6.74% | 2.95% | 5.37% | -6.32% | 43 |
| regressao_linear | 8.46% | 2.44% | 7.64% | -8.44% | 43 |
| ridge | 10.01% | 2.48% | 9.41% | -10.11% | 43 |

Modelo selecionado pelo menor MAPE medio de 12 meses: `gradient_boosting`.

A projecao e exploratoria e nao determina o gasto futuro. Choques de politica, tabela SUS, demanda ou capacidade assistencial podem alterar os valores.