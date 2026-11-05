# Handoff — evidencia de modelo

**Status:** modelo nominal selecionado por menor MAPE medio no protocolo congelado.

Este arquivo e gerado por `python scripts/modelagem_preditiva.py`; os numeros abaixo sao lidos da serie nacional e dos resultados do proprio backtest, nao digitados manualmente.

## Protocolo

- Entrada: `dados_tratados/dialise_mensal_brasil_total.csv`, serie mensal nacional continua de 2015-01 a 2026-06, com 138 competencias.
- Alvos: `valor_aprovado` (R$ nominais) e `valor_aprovado_real` (R$ corrigidos pelo IPCA para junho de 2026).
- Origem de avaliacao: 2022-01; horizonte: 12 meses; 43 janelas moveis mensais. Em cada origem, o treino usa apenas competencias anteriores e os 12 passos sao previstos sem incorporar observacoes intermediarias.
- Benchmark: sazonal ingenuo, repetindo os 12 ultimos meses do treino.
- Holt-Winters log: transformacao Box-Cox lambda 0, tendencia aditiva, sazonalidade aditiva, periodo 12, tendencia nao amortecida e inicializacao estimada.
- Modelos supervisionados: regressao linear, Ridge, Random Forest e Gradient Boosting com as features temporais do pipeline (`indice_tempo`, `mes`, `mes_sin`, `mes_cos`).
- MASE: MAE da janela dividido pelo MAE sazonal ingenuo de periodo 12, calculado somente dentro do respectivo treino. Ele nao substitui a comparacao explicita do benchmark no teste.
- A faixa empirica de 95% usa o percentil 95 do erro absoluto historico por horizonte; nao e intervalo de confianca parametrico nem garantia de cobertura futura.
- Ambiente reproduzido: pandas 3.1.1, NumPy 2.5.4, scikit-learn 1.8.0, SciPy 1.18.1, statsmodels 0.14.6; versoes fixadas em `requirements.txt`.

## Decisao

- Modelo nominal oficial: `holt_winters_log`; MAPE medio 3,5621%, MASE 0,8160 e vies -1,3987%.
- Melhor modelo de aprendizagem nominal: `gradient_boosting`; MAPE medio 5,3518%.
- Benchmark sazonal explicito: MAPE medio 8,4495%.
- Detalhe operacional: 3612 previsoes fora da amostra.
- A serie marca 2026-05, 2026-06 como competencias provisorias. Elas permanecem sem correcao automatica e entram nas ultimas janelas conforme o arquivo-fonte.

## Alvo nominal

| Modelo | Tipo | MAPE medio | MAPE mediano | MASE | Vies | Janelas | Nao convergiu |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| holt_winters_log | estatistico | 3,5621% | 2,3542% | 0,8160 | -1,3987% | 43 | 0 |
| holt_winters | estatistico | 4,4409% | 3,5127% | 1,0176 | -0,8903% | 43 | 2 |
| gradient_boosting | aprendizagem | 5,3518% | 4,4247% | 1,2344 | -4,9808% | 43 | 0 |
| random_forest | aprendizagem | 6,7387% | 5,3749% | 1,5592 | -6,3196% | 43 | 0 |
| sazonal_ingenuo | baseline | 8,4495% | 8,8330% | 1,9402 | -8,4974% | 43 | 0 |
| regressao_linear | aprendizagem | 8,4556% | 7,6379% | 1,8999 | -8,4366% | 43 | 0 |
| ridge | aprendizagem | 10,0078% | 9,4095% | 2,2430 | -10,1079% | 43 | 0 |

## Alvo real

| Modelo | Tipo | MAPE medio | MAPE mediano | MASE | Vies | Janelas | Nao convergiu |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| gradient_boosting | aprendizagem | 3,9210% | 3,3084% | 0,9786 | -2,8061% | 43 | 0 |
| holt_winters_log | estatistico | 4,0070% | 2,5380% | 0,9940 | -1,5995% | 43 | 0 |
| random_forest | aprendizagem | 4,5626% | 4,0298% | 1,1295 | -2,7651% | 43 | 0 |
| holt_winters | estatistico | 4,6112% | 3,9206% | 1,1312 | -0,6592% | 43 | 3 |
| sazonal_ingenuo | baseline | 4,8822% | 4,7317% | 1,2185 | -3,7745% | 43 | 0 |
| regressao_linear | aprendizagem | 5,6973% | 5,1189% | 1,4084 | -4,7021% | 43 | 0 |
| ridge | aprendizagem | 5,7949% | 5,3631% | 1,4318 | -4,8589% | 43 | 0 |

## Ressalvas

- As 43 janelas se sobrepoem e nao sao observacoes independentes.
- A selecao e comparativa e descritiva; nao existe holdout final pre-registrado.
- Maio e junho de 2026 sao provisorios e nao receberam correcao automatica.
- MAPE mede erro percentual medio; nao representa acuracia ou certeza.
- O procedimento supervisionado atual e multietapas direto, nao recursivo.
