# Auditoria dos modelos preditivos - novembro de 2026

## Decisao

O modelo oficial da previsao de valor aprovado nominal passou a ser o
Holt-Winters log-aditivo (`holt_winters_log`). A escolha segue uma regra
reproduzivel: menor MAPE medio no backtest multietapas de 12 meses.

O Gradient Boosting permanece no estudo como o melhor modelo de aprendizagem
de maquina no alvo nominal e como vencedor por pequena margem no alvo real,
mas nao e o modelo publicado para a serie nominal.

## Por que o Gradient Boosting parecia vencer

O pipeline anterior publicava no arquivo operacional apenas os modelos com
`tipo = aprendizagem` e mantinha `gradient_boosting` fixado em uma constante.
Holt-Winters aparecia somente na evidencia complementar. Portanto, o Gradient
Boosting era o primeiro colocado dentro de um subconjunto, mas nao o vencedor
geral da tarefa nominal.

O benchmark sazonal ingenuo tambem nao aparecia como uma previsao avaliada fora
da amostra. O MASE usava corretamente uma escala sazonal calculada no treino,
mas isso nao substitui a comparacao explicita do benchmark no periodo de teste.

## Protocolo refeito

- Serie mensal nacional: janeiro de 2015 a junho de 2026, 138 observacoes.
- Origem inicial do backtest: janeiro de 2022.
- 43 janelas moveis de teste, cada uma com horizonte de 12 meses.
- Nenhum valor real intermediario do teste e fornecido aos modelos.
- Alvos: valor nominal e valor corrigido pelo IPCA para junho de 2026.
- Modelos: sazonal ingenuo, Holt-Winters aditivo, Holt-Winters log-aditivo,
  Regressao Linear, Ridge, Random Forest e Gradient Boosting.
- Metricas: MAPE medio e mediano, MAE, RMSE, MASE e vies percentual.

## Resultado nominal

| Modelo | Tipo | MAPE medio | MAPE mediano | MASE | Vies |
| --- | --- | ---: | ---: | ---: | ---: |
| Holt-Winters log-aditivo | estatistico | 3,56% | 2,35% | 0,82 | -1,40% |
| Holt-Winters aditivo | estatistico | 4,44% | 3,51% | 1,02 | -0,89% |
| Gradient Boosting | aprendizagem | 5,35% | 4,42% | 1,23 | -4,98% |
| Random Forest | aprendizagem | 6,74% | 5,37% | 1,56 | -6,32% |
| Sazonal ingenuo | baseline | 8,45% | 8,83% | 1,94 | -8,50% |
| Regressao Linear | aprendizagem | 8,46% | 7,64% | 1,90 | -8,44% |
| Ridge | aprendizagem | 10,01% | 9,41% | 2,24 | -10,11% |

O Holt-Winters log-aditivo venceu o Gradient Boosting em 40 das 43 janelas.
O modelo tambem ficou abaixo de 1 no MASE, indicando erro medio inferior a
escala sazonal ingenua calculada dentro de cada treino.

## Resultado real

No alvo corrigido pelo IPCA, o Gradient Boosting obteve MAPE de 3,92%, e o
Holt-Winters log-aditivo, 4,01%. A diferenca pequena e a inversao de ranking
mostram que o Gradient Boosting funciona melhor quando a tendencia inflacionaria
e removida. Isso nao justifica usa-lo para a previsao nominal, que e a variavel
publicada no painel.

## Interpretacao tecnica

Modelos de arvores aprendem divisoes dentro da faixa observada e nao extrapolam
uma tendencia crescente de forma natural. Na serie nominal, isso produziu uma
previsao quase plana e vies de subestimacao de -4,98%. O Holt-Winters possui
componentes explicitos de tendencia e sazonalidade. A transformacao logaritmica
estabiliza a variancia e representa melhor mudancas proporcionais ao nivel da
serie, reduzindo o erro sem eliminar o padrao mensal.

## Robustez

- Sem maio e junho de 2026, meses provisorios, o Holt-Winters log-aditivo
  permaneceu vencedor: MAPE de 3,62%, contra 5,44% do Gradient Boosting.
- Em origens anuais nao sobrepostas, o Holt-Winters log-aditivo obteve MAPE de
  4,48%, contra 6,95% do Gradient Boosting.
- A versao de Gradient Boosting com defasagens recursivas piorou o MAPE nominal
  para 5,74%; por isso, nao substituiu a especificacao atual.
- O Holt-Winters log-aditivo convergiu nas 43 janelas nominais.

## Limites

O menor erro historico nao garante o mesmo desempenho futuro. A faixa exibida
no painel e empirica: usa o percentil 95 do erro absoluto historico por horizonte
e nao constitui intervalo probabilistico parametrico. Os meses mais recentes
sao provisorios, e mudancas na tabela SUS, capacidade assistencial ou politica
publica podem alterar o comportamento da serie.

