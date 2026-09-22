# Handoff — Bussola · Onda 1.3 — evidencia de modelo

**Status:** pronto no escopo revisado, com ressalvas metodologicas.

Este arquivo e gerado por `python scripts/modelagem_preditiva.py`; os numeros abaixo sao lidos da serie nacional e dos resultados do proprio backtest, nao digitados manualmente.

## DECLARADO — protocolo e limites

- Entrada: `dados_tratados/dialise_mensal_brasil_total.csv`, serie mensal nacional continua de 2015-01 a 2026-06, com 138 competencias.
- Alvos: `valor_aprovado` (R$ nominais) e `valor_aprovado_real` (R$ corrigidos pelo IPCA para junho de 2026).
- Origem de avaliacao: 2022-01; horizonte: 12 meses; 43 janelas moveis mensais. Em cada origem, o treino usa apenas competencias anteriores e os 12 passos sao previstos sem incorporar observacoes intermediarias.
- Holt-Winters: ETS com tendencia aditiva, sazonalidade aditiva, periodo sazonal 12, tendencia nao amortecida, inicializacao estimada e otimizacao numerica do statsmodels.
- Modelos supervisionados: regressao linear, Ridge, Random Forest e Gradient Boosting com as features temporais do pipeline (`indice_tempo`, `mes`, `mes_sin`, `mes_cos`).
- MAPE da janela: media de `abs(real - previsto) / real`; MAPE geral: media entre janelas. Vies da janela: `sum(previsto) / sum(real) - 1`; vies geral: media entre janelas.
- Por horizonte, MAPE e a media do erro percentual absoluto das 43 previsoes; vies e a media de `(previsto / real - 1)` no mesmo horizonte. Valor negativo indica subestimacao.
- MASE: MAE da janela dividido pelo MAE sazonal ingenuo de periodo 12, calculado somente dentro do respectivo treino. Menor que 1 supera essa referencia na metrica.
- MAPE nao e intervalo de confianca. Em particular, um MAPE de 5,35% nao expressa 94,65% de certeza. A faixa empirica de 95% do pipeline e outro objeto: percentil 95 do erro absoluto historico por horizonte.
- Ambiente reproduzido: pandas 2.3.3, NumPy 2.4.3, scikit-learn 1.8.0, SciPy 1.17.1, statsmodels 0.14.6; versoes fixadas em `requirements.txt`.

## OBSERVADO — estado do repositorio

- `dados_tratados/metricas_modelos_preditivos_corrigido.csv` continua contendo somente os quatro modelos supervisionados e preserva `gradient_boosting` como primeiro colocado operacional.
- `dados_tratados/backtest_horizonte_12m_detalhado.csv` continua com 2064 linhas: 4 modelos x 43 janelas x 12 horizontes.
- A previsao oficial permanece travada em `gradient_boosting` por `OFFICIAL_MODEL` no script. O vencedor das tabelas de evidencia nao e promovido automaticamente.
- A serie marca 2026-05, 2026-06 como competencias provisorias. Elas permanecem sem correcao automatica e entram nas ultimas janelas conforme o arquivo-fonte.

## MEDIDO — primeiro, a derrota nominal

No alvo nominal, Holt-Winters obteve MAPE medio de 4,4409% e vies de -0,8903%, contra 5,3518% e -4,9808% do Gradient Boosting. Logo, o Gradient Boosting perde nominalmente em MAPE. A ressalva e decisiva: o MASE do Holt-Winters foi 1,0176, ainda acima de 1.

Fonte: `dados_tratados/evidencia_modelos_resumo.csv`.

| Modelo | Tipo | MAPE medio | MAPE mediano | MASE | Vies | Janelas | Nao convergiu |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| holt_winters | baseline | 4,4409% | 3,5127% | 1,0176 | -0,8903% | 43 | 2 |
| gradient_boosting | aprendizagem | 5,3518% | 4,4247% | 1,2344 | -4,9808% | 43 | 0 |
| random_forest | aprendizagem | 6,7387% | 5,3749% | 1,5592 | -6,3196% | 43 | 0 |
| regressao_linear | aprendizagem | 8,4556% | 7,6379% | 1,8999 | -8,4366% | 43 | 0 |
| ridge | aprendizagem | 10,0078% | 9,4095% | 2,2430 | -10,1079% | 43 | 0 |

### Erro e vies nominal por horizonte

Fonte: `dados_tratados/evidencia_modelos_horizonte.csv`.

| Horizonte | Holt-Winters MAPE | Holt-Winters vies | Gradient Boosting MAPE | Gradient Boosting vies |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 2,60% | -0,56% | 3,20% | -1,64% |
| 2 | 2,74% | -0,60% | 3,13% | -2,27% |
| 3 | 3,00% | -0,69% | 3,58% | -2,99% |
| 4 | 3,49% | -0,78% | 4,27% | -3,60% |
| 5 | 3,78% | -0,70% | 4,62% | -4,05% |
| 6 | 4,29% | -0,86% | 5,28% | -4,70% |
| 7 | 4,56% | -0,89% | 5,54% | -5,24% |
| 8 | 4,96% | -0,84% | 5,96% | -5,63% |
| 9 | 5,38% | -0,82% | 6,48% | -6,13% |
| 10 | 5,87% | -0,78% | 6,77% | -6,60% |
| 11 | 6,05% | -0,98% | 7,37% | -7,29% |
| 12 | 6,58% | -1,00% | 8,02% | -7,98% |

## MEDIDO — depois, a vitoria no alvo real

No alvo real, o Gradient Boosting obteve o menor MAPE medio: 3,9210%, com MASE 0,9786 e vies -2,8061%. O Holt-Winters ficou em 4,5928% de MAPE, MASE 1,1260 e vies -0,5786%. Nesta comparacao informada, o Gradient Boosting vence quando a tendencia inflacionaria e removida do alvo.

Fonte: `dados_tratados/evidencia_modelos_resumo.csv`.

| Modelo | Tipo | MAPE medio | MAPE mediano | MASE | Vies | Janelas | Nao convergiu |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| gradient_boosting | aprendizagem | 3,9210% | 3,3084% | 0,9786 | -2,8061% | 43 | 0 |
| random_forest | aprendizagem | 4,5633% | 4,0298% | 1,1297 | -2,7651% | 43 | 0 |
| holt_winters | baseline | 4,5928% | 3,9206% | 1,1260 | -0,5786% | 43 | 1 |
| regressao_linear | aprendizagem | 5,6973% | 5,1189% | 1,4084 | -4,7021% | 43 | 0 |
| ridge | aprendizagem | 5,7949% | 5,3631% | 1,4318 | -4,8589% | 43 | 0 |

### Erro e vies real por horizonte

Fonte: `dados_tratados/evidencia_modelos_horizonte.csv`.

| Horizonte | Holt-Winters MAPE | Holt-Winters vies | Gradient Boosting MAPE | Gradient Boosting vies |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 2,52% | -0,43% | 2,72% | -1,31% |
| 2 | 2,73% | -0,39% | 2,81% | -1,57% |
| 3 | 2,89% | -0,43% | 3,09% | -1,93% |
| 4 | 3,52% | -0,49% | 3,58% | -2,32% |
| 5 | 3,79% | -0,42% | 3,90% | -2,50% |
| 6 | 4,50% | -0,59% | 4,13% | -2,83% |
| 7 | 4,68% | -0,61% | 4,38% | -3,07% |
| 8 | 5,14% | -0,60% | 4,55% | -3,12% |
| 9 | 5,72% | -0,53% | 4,24% | -3,26% |
| 10 | 6,07% | -0,42% | 4,63% | -3,33% |
| 11 | 6,43% | -0,54% | 4,50% | -3,55% |
| 12 | 7,12% | -0,46% | 4,52% | -3,71% |

## Ressalvas que bloqueiam uma troca automatica

- O otimizador do Holt-Winters nao declarou convergencia em 2 das 43 janelas nominais e 1 das 43 janelas reais. As previsoes foram mantidas para reproduzir o protocolo avulso; a contagem esta materializada no CSV.
- As 43 janelas se sobrepoem e nao sao observacoes independentes.
- Nao existe subconjunto final intocado e pre-registrado: os mesmos 43 recortes ja foram vistos na comparacao historica. Portanto, esta e evidencia comparativa/descritiva, nao confirmacao independente de um novo vencedor.
- Maio e junho de 2026 sao provisorios e aproximadamente 1% subestimados segundo a regra do projeto; nenhuma correcao automatica foi aplicada.
- Trocar o modelo oficial, o alvo publicado ou a origem que exclui meses provisorios pertence ao Gate G-A e depende da autora e do orientador.

## Artefatos e verificacao

- `scripts/modelagem_preditiva.py`: executa os dois alvos, inclui Holt-Winters e preserva o modelo oficial.
- `dados_tratados/evidencia_modelos_resumo.csv`: metricas agregadas por alvo e modelo.
- `dados_tratados/evidencia_modelos_janelas.csv`: uma linha por alvo, modelo e origem.
- `dados_tratados/evidencia_modelos_detalhado.csv`: uma linha por previsao e horizonte.
- `dados_tratados/evidencia_modelos_horizonte.csv`: erro e vies agregados por horizonte.
- `python scripts/modelagem_preditiva.py`: reproduziu os artefatos.
- `python scripts/validar_dados.py`: concluiu sem erros e conferiu alvos, modelos, janelas, horizontes, cardinalidades e preservacao do Gradient Boosting.
- `python -m compileall scripts`: deve encerrar sem erro de sintaxe.

## Gate

Nenhuma troca de modelo foi feita. A decisao metodologica continua com a autora e o orientador.

VAULT: C:\Users\Antonio\AI-Vault\00-SISTEMA\MEMORY_PROTOCOL.md -> codigo e CSVs sao a verdade operacional; o handoff guarda decisao, procedencia e limites, nao logs brutos.
VAULT: C:\Users\Antonio\AI-Vault\04-DECISOES-GLOBAIS\DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md -> Vault consultado antes da implementacao e regras aplicadas declaradas na entrega.
VAULT: C:\Users\Antonio\AI-Vault\01-PROJETOS\DialisaSUS\DECISOES.md -> MASE contra sazonal ingenuo, erro por horizonte e gate academico preservados; modelo oficial nao foi trocado.
VAULT: C:\Users\Antonio\AI-Vault\01-PROJETOS\DialisaSUS\ROADMAP.md -> tarefa 1.3 e Gate G-A respeitados; derrota nominal vem antes da vitoria no alvo real.
VAULT: C:\Users\Antonio\AI-Vault\01-PROJETOS\DialisaSUS\BENCHMARKS.md -> benchmark reproduzivel devolvido ao Vault com condicoes, limites e decisao sustentada.
VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\ANTI-PADROES\ANTI-PADRAO-PROVAS-FALSAS-OU-INVENTADAS.md -> nenhuma metrica foi publicada sem fonte reproduzivel; limitacoes e falhas de convergencia foram explicitadas.
