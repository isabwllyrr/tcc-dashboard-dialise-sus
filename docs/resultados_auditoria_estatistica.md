# Resultados auditados

## Comparacao dos periodos completos

| Periodo | Meses | Valor medio mensal | Quantidade media mensal | Valor por procedimento |
| --- | ---: | ---: | ---: | ---: |
| Pre-pandemia (2015-2019) | 60 | R$ 234.863.469 | 1.218.883 | R$ 192,69 |
| Pandemia (2020-2021) | 24 | R$ 269.228.429 | 1.369.322 | R$ 196,61 |
| Pos-pandemia (2022-2025) | 48 | R$ 355.273.896 | 1.507.842 | R$ 235,62 |

Na comparacao pos-pandemia versus pre-pandemia, o valor medio mensal aumentou 51,27%, a quantidade media mensal aumentou 23,71% e o valor aprovado por procedimento aumentou 22,28%. Como os valores sao nominais, essa diferenca financeira nao deve ser interpretada integralmente como aumento real de custo.

Entre 2015 e 2025, ambos anos completos, o valor anual aprovado cresceu 88,61% e a quantidade anual cresceu 40,46%. Os dez municipios com maior valor aprovado concentraram 21,01% do valor territorial de 2015 a 2025.

Esses resultados demonstram crescimento dos procedimentos aprovados, nao do numero de pacientes. Tambem nao permitem atribuir causalidade a pandemia; sustentam apenas uma comparacao temporal entre periodos.

## Modelagem

O Gradient Boosting permaneceu vencedor no backtesting alinhado ao horizonte real de 12 meses, com MAPE medio de 5,35%, desvio-padrao de 2,82 pontos percentuais, mediana de 4,42% e vies medio de -4,98%. O vies negativo indica que, em media, as previsoes ficaram abaixo dos valores observados nas janelas historicas.

Foram usadas 43 janelas moveis de 12 meses. Em cada janela, o treinamento termina antes do primeiro mes previsto e nenhum valor real intermediario do periodo de teste e fornecido ao modelo.
