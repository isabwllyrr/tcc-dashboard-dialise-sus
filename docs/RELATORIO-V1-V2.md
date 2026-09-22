# Relatório v1 × v2 — auditoria de dados e método do DialisaSUS

**Para:** a autora e o orientador
**De:** equipe da remodelação (etapa 1 do plano v2/v3)
**Data:** 15 de setembro de 2026
**Base auditada:** repositório `isabwllyrr/tcc-dashboard-dialise-sus`, commit `c17071e`, branch de trabalho `remodelacao-v2`
**Decisão que este documento pede:** aprovar, rejeitar ou adiar cada um dos seis itens da seção 7. **Nenhum número muda na narrativa do trabalho antes dessa aprovação.**

---

## 0. Resumo em uma página

**Os números do trabalho estão certos.** Foram recalculados um a um contra a base tratada e não houve nenhuma divergência: R$ 40,03 bilhões, 187,95 milhões de procedimentos, R$ 212,97 de custo médio, +51,27% do pré para o pós-pandemia, +88,61% entre 2015 e 2025. O custo médio foi calculado da forma correta, a soma territorial fecha exatamente com a nacional, e o backtest é reprodutível: rodando o script de novo saem os mesmos MAPE de 5,35%, mediana de 4,42% e viés de −4,98%.

O que esta auditoria encontrou não são erros de conta. São **quatro escolhas de método** que mudam a interpretação, e **duas questões de recorte** que precisam de decisão.

1. **Em valores reais a história é outra.** Corrigido pelo IPCA para reais de junho de 2026, o crescimento de +88,61% entre 2015 e 2025 vira **+11,34%**. E o valor por procedimento, que sobe 22,28% em termos nominais, **cai 13,74%** em termos reais. O gasto não disparou: o volume cresceu enquanto a remuneração por procedimento perdeu da inflação.
2. **O modelo escolhido perde para um método simples.** Acrescentando quatro baselines ao mesmo protocolo de 43 janelas, o Holt-Winters faz MAPE de 4,44% contra 5,35% do Gradient Boosting, com viés de −0,89% contra −4,98%. O viés do Gradient Boosting cresce de −1,6% no primeiro mês para −8,0% no décimo segundo, o que é a assinatura de um modelo que não extrapola tendência.
3. **Os dois últimos meses da série não são comparáveis aos anteriores.** Maio e junho de 2026 vêm de uma extração restrita à competência de processamento mai–jun, com menos ciclos acumulados. Medimos a diferença: são cerca de 1% subestimados. E é exatamente deles que a previsão parte.
4. **A taxa por 100 mil habitantes tem um salto artificial em 2022.** A troca da estimativa populacional pelo Censo 2022 derruba o denominador em 4,80%. Dos +7,85% de aumento da taxa em 2022, aproximadamente **5,9 pontos percentuais são artefato do denominador**.
5. **O recorte é de hemodiálise, não de diálise em geral.** DPAC e DPA não estão entre os 24 procedimentos extraídos. O acompanhamento pré-dialítico está, como o texto afirma.
6. **O território é por local de atendimento.** Isso infla a taxa por habitante de municípios que são polo regional.

---

## 1. Pergunta desta auditoria

Os números publicados no trabalho e no painel são reprodutíveis a partir dos dados do repositório, e o método que os produz sustenta as conclusões que o trabalho tira deles?

Duas coisas distintas. A primeira é verificação e tem resposta objetiva. A segunda é julgamento metodológico e é o que este relatório submete a vocês.

---

## 2. Fontes e datas

| Fonte | O que traz | Recorte | Onde |
|---|---|---|---|
| SIA/SUS via TabNet, extração principal | Valor e quantidade aprovados, mensal por grupo e anual por município | `Jan/2015-Abr/2026`, 24 procedimentos, por local de **atendimento** | `dados_brutos/*_dialise_brasil.csv` |
| SIA/SUS via TabNet, atualização | Os mesmos indicadores | Competência de processamento `Mai-Jun/2026`, 25 procedimentos | `dados_brutos/atualizacao_2026_05_06_*.csv` |
| IBGE, estimativas populacionais (Tabela 6579) | População residente estimada | 2015–2021, 2024, 2025 | `dados_brutos/populacao_ibge_estimada_2015_2025.csv` |
| IBGE, Censo 2022 (Tabela 4709) | População residente | 2022 | `dados_brutos/populacao_ibge_censo_2022.csv` |
| IBGE, IPCA (Tabela 1737) | Número-índice mensal | 2015-01 a 2026-06 | `dados_brutos/ipca_ibge_indice_2015_2026_06.csv` |

O recorte de procedimentos **não está registrado em nenhum lugar do código**. Ele existe apenas na terceira linha do cabeçalho de cada arquivo do TabNet, que o parser do projeto descarta ao ler. Esta auditoria o extraiu e transcreveu em `docs/RECORTE-SIGTAP.md`, gerado a partir da fonte e regerável a cada nova extração.

---

## 3. Definições usadas

| Termo | Definição adotada |
|---|---|
| Procedimento aprovado | Unidade de análise. Uma sessão de hemodiálise aprovada no SIA. **Não é uma pessoa**: um paciente em hemodiálise faz até 13 sessões por mês. |
| Valor aprovado | Valor em reais aprovado no SIA para o procedimento, na competência de atendimento. |
| Valor real | Valor aprovado multiplicado pelo fator do IPCA com base em **junho de 2026**. Mede poder de compra geral, **não** a política de reajuste da tabela SUS. |
| Custo médio por procedimento | Σvalor ÷ Σquantidade do período. Nunca média das médias mensais. |
| Competência | Mês de atendimento, não de processamento. |
| Dado provisório | Competência cujo processamento ainda não se encerrou e que ainda vai receber lançamentos. |
| Taxa por 100 mil habitantes | Quantidade anual ÷ população do ano × 100.000. |

---

## 4. O que foi conferido e fechou

Nenhum destes itens exige ação. Estão aqui porque um relatório que só lista problemas não permite avaliar o que está sólido.

| Verificação | Resultado |
|---|---|
| Valor total 2015 a 06/2026 | R$ 40.028.005.878 contra R$ 40,03 bi declarados ✓ |
| Quantidade total | 187.952.016 contra 187,95 mi ✓ |
| Custo médio | R$ 212,97 ✓ — e calculado como Σvalor÷Σqtd, que é o correto. A média das médias mensais daria R$ 210,59 |
| Médias mensais por período | R$ 234,86 mi · R$ 269,23 mi · R$ 355,27 mi ✓, todas exatas |
| Variações pós × pré | +51,27% · +23,71% · +22,28% ✓ |
| Variações 2025 × 2015 | +88,61% · +40,46% ✓ |
| Decomposição multiplicativa | 1,2371 × 1,2228 = 1,5127 ✓ fecha |
| **Soma do território = total nacional** | R$ 37.606.437.447 e 178.373.113 procedimentos, **diferença exatamente zero** em 2015–2025 |
| Top 10 municípios | 21,0061% do valor territorial ✓, e o denominador usado é o próprio total nacional do período |
| Continuidade da série | 138 meses sem buraco e sem duplicata |
| Correção monetária | `valor_real = nominal × fator` vale em todos os meses; fator igual a 1,000000 em jun/2026 ✓ |
| Reprodutibilidade do backtest | Rodando de novo: MAPE 5,3518%, mediano 4,4250%, desvio 2,8224 p.p., viés −4,9814% — **idênticos aos publicados** |
| Homogeneidade do recorte | A atualização traz um 25º código (transporte sanitário, grupo 08), e o pipeline o descarta antes de agregar, com justificativa escrita no código. Depois da exclusão as duas extrações cobrem os mesmos 24 procedimentos. **Decisão correta.** |
| Validador e testes | `python scripts/validar_dados.py` e `python -m unittest discover -s tests` passam |

---

## 5. Os achados, um a um

### 5.1 Em valores reais, o crescimento é outro — e o sinal se inverte

A série já tem a coluna `valor_aprovado_real`, criada pela própria autora em 15/09. Ela ainda não aparece na narrativa.

| Indicador | Nominal | Em reais de jun/2026 |
|---|---:|---:|
| Valor total 2015 a 06/2026 | R$ 40,03 bi | **R$ 52,74 bi** |
| Custo médio por procedimento | R$ 212,97 | R$ 280,62 |
| Valor anual 2015 | R$ 2,50 bi | R$ 4,44 bi |
| Valor anual 2025 | R$ 4,72 bi | R$ 4,95 bi |
| **Crescimento 2015 → 2025** | **+88,61%** | **+11,34%** |
| Pós × pré: valor médio mensal | +51,27% | **+6,71%** |
| Pós × pré: quantidade | +23,71% | +23,71% |
| **Pós × pré: valor por procedimento** | **+22,28%** | **−13,74%** |

A quantidade não muda, porque não é monetária. O que muda é tudo o que envolve dinheiro.

**O que isso significa.** Em termos nominais a leitura é "o gasto com diálise quase dobrou". Em termos reais é outra: **o volume de procedimentos cresceu cerca de 24% enquanto o valor real por procedimento caiu cerca de 14%.** O gasto real subiu pouco porque o aumento de produção foi em grande parte compensado pela perda de valor real da remuneração.

Para gestão em saúde, a segunda leitura é mais forte e mais útil. Ela descreve um sistema que atende mais gente com menos dinheiro real por atendimento — que é uma afirmação sobre sustentabilidade, não sobre descontrole de gasto.

**Uma ressalva importante.** "Valor real" pelo IPCA mede poder de compra geral. Ele **não** é a política de reajuste da tabela SUS, que só o SIGTAP por competência responde e está fora deste ciclo. A queda de 13,74% deve ser lida como "a remuneração perdeu da inflação geral", não como "houve um corte de 13,74% na tabela".

**Sobre decompor em porcentagens.** A decomposição em participações logarítmicas funciona bem no caso nominal — quantidade explica 51,4% do crescimento e preço 48,6%. No caso real ela **não deve ser usada**: como o crescimento total é próximo de zero, o denominador da conta tende a zero e as participações explodem para +328% e −228%. São matematicamente corretas e comunicacionalmente falsas. No caso real a forma honesta é a multiplicativa direta: quantidade +23,71%, preço real −13,74%, produto +6,71%.

### 5.2 O modelo escolhido perde para um método simples

O trabalho compara quatro modelos supervisionados entre si e elege o de menor MAPE. O protocolo de validação está correto — 43 janelas móveis, treino só com o passado, 12 meses projetados sem acesso a valores intermediários. O que falta é **referência**: comparar candidatos entre si diz qual é o melhor do conjunto, não se algum deles é bom.

Acrescentamos quatro baselines ao **mesmo protocolo, mesmas janelas, mesmo alvo**:

| Modelo | Tipo | MAPE médio | MAPE mediano | MASE | Viés |
|---|---|---:|---:|---:|---:|
| **Holt-Winters (ETS)** | baseline | **4,44%** | **3,51%** | **1,02** | **−0,89%** |
| Sazonal ingênuo com drift | baseline | 4,99% | 4,65% | 1,12 | −0,37% |
| Gradient Boosting | *escolhido na v1* | 5,35% | 4,43% | 1,23 | −4,98% |
| Random Forest | aprendizagem | 6,74% | 5,38% | 1,56 | −6,32% |
| Regressão linear | aprendizagem | 8,46% | 7,64% | 1,90 | −8,44% |
| Sazonal ingênuo | baseline | 8,45% | 8,83% | 1,94 | −8,50% |
| Média móvel de 12 meses | baseline | 8,66% | 9,21% | 2,00 | −8,50% |
| Ridge | aprendizagem | 10,01% | 9,41% | 2,24 | −10,11% |

O MASE compara o erro com o do sazonal ingênuo dentro da amostra de treino: acima de 1 significa que o modelo não supera essa referência.

**O erro cresce com o horizonte, e o viés também:**

| Horizonte (meses à frente) | 1 | 3 | 6 | 9 | 12 |
|---|---:|---:|---:|---:|---:|
| Gradient Boosting, erro absoluto médio | 3,20% | 3,58% | 5,28% | 6,48% | **8,02%** |
| Gradient Boosting, **viés** | −1,64% | −2,99% | −4,70% | −6,13% | **−7,98%** |
| Holt-Winters, erro absoluto médio | 2,60% | 3,00% | 4,29% | 5,38% | 6,58% |
| Holt-Winters, **viés** | −0,56% | −0,69% | −0,86% | −0,82% | −1,00% |

Um viés que cresce monotonicamente com o horizonte não é ruído: é a assinatura de um modelo que **não extrapola tendência**. Faz sentido — o Gradient Boosting recebe apenas índice de tempo e mês como entrada, e árvores de decisão não conseguem produzir valores fora da faixa que viram no treino. O Holt-Winters tem um componente de tendência explícito e o viés fica estável em torno de −1%.

**A consequência prática na projeção:**

| Cenário | Total projetado em 12 meses | Primeiro mês | Inclinação no período |
|---|---:|---:|---:|
| v1: Gradient Boosting, série completa | R$ 4,937 bi | R$ 414,9 mi | **−1,81%** |
| Holt-Winters, série completa | R$ 5,116 bi | R$ 420,8 mi | **+2,38%** |

A diferença entre as duas é de R$ 179 milhões. E os dados observados nos últimos 12 meses cresceram **+4,27%** em relação aos 12 anteriores — ou seja, o modelo atual projeta queda enquanto a série vinha subindo.

**Um achado colateral que muda a recomendação.** Rodando o mesmo backtest sobre a série **deflacionada**, o Gradient Boosting sobe para 3,92% de MAPE, MASE de 0,98 e viés de −2,81%. Sem a tendência inflacionária embutida, o modelo passa a funcionar bem e finalmente supera a referência trivial. Isso reforça o diagnóstico: o problema não é o algoritmo, é pedir a ele que extrapole uma tendência que ele não consegue representar.

### 5.3 Os dois últimos meses da série não são comparáveis aos anteriores

A extração principal cobre `Jan/2015-Abr/2026`. A atualização cobre a competência de **processamento** `Mai-Jun/2026`, e é dela que saem maio e junho de 2026 — os dois últimos pontos da série e a origem da previsão.

Os dois arquivos se sobrepõem em fevereiro, março e abril de 2026, e isso permite **medir** quanto uma competência ainda cresce depois da primeira extração:

| Competência de atendimento | Na extração principal | Acrescentado pela atualização | Acréscimo |
|---|---:|---:|---:|
| Fev/2026 | R$ 369.527.943 | R$ 46.480 | +0,013% |
| Mar/2026 | R$ 412.089.733 | R$ 452.277 | +0,110% |
| Abr/2026 | R$ 396.764.541 | R$ 3.544.105 | **+0,893%** |

O padrão é claro: uma competência ganha em torno de 0,9% nos dois ciclos seguintes de processamento, depois 0,1%, depois praticamente nada. Maio e junho de 2026 ainda não passaram por esses ciclos, então estão subestimados em algo próximo de **1%**.

O pipeline já faz a coisa certa ao não sobrescrever fevereiro a abril com os valores parciais da atualização — a condição é `data > último mês da base`. O que falta é reconhecer que os dois meses que entram carregam menos maturação.

**Recomendação.** Excluir os dois últimos meses da **origem da previsão**, e guardar cada extração como um *vintage* datado a partir de agora, para que a próxima medição de revisão seja limpa em vez de inferida da sobreposição de dois recortes diferentes.

Excluir esses meses muda pouco o backtest (MAPE do Gradient Boosting vai de 5,35% para 5,44%), mas muda a projeção: o total de 12 meses cai de R$ 4,937 bi para R$ 4,785 bi.

### 5.4 A taxa por 100 mil habitantes tem um salto artificial em 2022

A série populacional muda de base três vezes:

| Anos | Fonte | Observação |
|---|---|---|
| 2015–2021 | Estimativas do IBGE | Projeções com base no Censo 2010 |
| 2022 | **Censo Demográfico 2022** | Contagem, não projeção |
| 2023 | Interpolação geométrica | O IBGE não publicou estimativa municipal em 2023 |
| 2024–2025 | Estimativas do IBGE | Projeções com base no Censo 2022 |

O Censo 2022 encontrou **menos gente** do que as projeções previam. A soma das populações municipais cai de 213.317.639 em 2021 para 203.080.756 em 2022: **−4,80%** de um ano para o outro, o que não corresponde a nenhum fenômeno demográfico.

Efeito sobre a taxa nacional de procedimentos por 100 mil habitantes:

| Ano | Taxa publicada | Variação | Taxa se o denominador seguisse a tendência | Variação | Artefato |
|---|---:|---:|---:|---:|---:|
| 2021 | 7.701 | −0,79% | 7.701 | −0,79% | — |
| **2022** | **8.305** | **+7,85%** | 7.851 | **+1,95%** | **+5,90 p.p.** |
| 2023 | 8.501 | +2,36% | 8.163 | +3,98% | −1,62 p.p. |
| 2024 | 8.742 | +2,84% | 8.742 | +7,09% | −4,25 p.p. |

**Cerca de três quartos do salto de 2022 não é aumento de procedimentos: é a troca de base populacional.**

**Recomendação.** Não é apagar o Censo — ele é a medida melhor. É marcar a quebra: a série de taxas ganha um corte visível em 2022, a comparação 2021→2022 recebe ressalva explícita, e nenhuma variação anual de taxa atravessando 2022 é apresentada como achado. Registrar também que existe um município a mais em 2025 (5.571 contra 5.570), o que afeta a contagem do join mas não os totais.

### 5.5 O recorte é de hemodiálise, não de diálise em geral

Os 24 procedimentos extraídos estão transcritos em `docs/RECORTE-SIGTAP.md`. Do bloco de diálise peritoneal (`030501`) entram apenas:

- `0305010018` e `0305010026` — diálise peritoneal **intermitente** (DPI), que soma **R$ 88 mil em onze anos**, contra R$ 40 bilhões do total;
- `0305010034` — diálise peritoneal para pacientes **agudos**;
- `0305010182` — **treinamento** de paciente para DPAC e DPA, R$ 5,7 mil no período.

As sessões de **DPAC** (diálise peritoneal ambulatorial contínua) e **DPA** (automatizada) não aparecem. A numeração salta de `0305010131` para `0305010182`, exatamente na faixa onde elas ficariam. Ou seja: o recorte inclui o *treinamento* para uma modalidade cujas *sessões* ele não conta.

**Consequência.** O que a base mede é **hemodiálise e seus acessos vasculares**. O texto do trabalho descreve um recorte mais largo — "hemodiálise, diálise peritoneal, acompanhamento pré-dialítico, implantação de acessos e materiais associados". A parte de diálise peritoneal é, na prática, inexistente nos dados.

**O acompanhamento pré-dialítico, por outro lado, está incluído** (`0301130051` e `0301130060`), como o texto afirma. Um registro anterior nosso dizia o contrário; estava errado, porque olhou o arquivo de uma extração antiga do Ceará e não o recorte nacional vigente. Fica a correção.

**Um item a mais para conferir:** `0405050054 CICLODIALISE`. O prefixo `040505` é cirurgia do aparelho da visão — ciclodiálise é procedimento oftalmológico para glaucoma, sem relação com diálise renal. Parece captura por busca textual pela palavra "DIALISE". Não é possível quantificar o impacto com os arquivos atuais, porque a série nacional só vem agregada por grupo e a ciclodiálise cai no grupo 04, junto das fístulas e cateteres, que são legítimos.

### 5.6 O território é por local de atendimento

A primeira linha de toda extração nacional diz: *"Produção Ambulatorial do SUS - Brasil - por local de atendimento"*. Não é por local de residência.

Em diálise isso importa mais do que em quase qualquer outra linha de cuidado, porque o paciente se desloca três vezes por semana para a unidade, que muitas vezes fica em outro município. O município-polo recebe no numerador procedimentos de moradores de toda a região, e divide por uma população que é só a sua.

Os maiores crescimentos pós-pandemia do painel — Irecê na Bahia com 235,97%, Volta Redonda no Rio com 220,67%, Caraguatatuba em São Paulo com 206,13% — são exatamente o perfil de município que abre ou amplia um serviço e passa a atender a microrregião inteira.

**Duas saídas.** Declarar a limitação na interface, ao lado de toda taxa por habitante, e não interpretar taxa alta como prevalência alta. Ou re-extrair por local de residência, o que muda a base territorial inteira. A primeira é barata e honesta; a segunda é mais correta e cara. **A decisão é da autora.**

### 5.7 Duas verificações que não encontraram problema

Registradas porque resultado negativo também é resultado.

**Não há efeito de composição entre grupos.** A hipótese era que o valor por procedimento pudesse ter subido só por mudança de mix. Decompondo o aumento de 22,28% entre efeito de preço dentro de cada grupo e efeito de mix entre grupos: o preço intragrupo responde por **+22,29%** e o mix por **−0,01%**. O mix é irrelevante. Os três grupos mantiveram pesos praticamente idênticos (o grupo 03 vai de 98,72% para 98,75% da quantidade) e os três subiram de preço.

*Limite desta verificação:* ela só alcança os três grupos que a série traz. A composição **dentro** do grupo 03 — hemodiálise comum contra pediátrica, sorologia positiva, pré-dialítico — não é testável sem re-extração por procedimento.

**A soma territorial fecha com a nacional.** Diferença exatamente zero em valor e em quantidade, 2015–2025. Isso valida o denominador do "top 10 = 21,01%".

---

## 6. Limitações desta auditoria

- **Não re-extraímos nada do TabNet.** Todo o trabalho parte dos arquivos do repositório. O que depende de re-extração — DPAC/DPA, ciclodiálise, residência, composição dentro do grupo 03 — fica apontado, não resolvido.
- **A medição da revisão dos provisórios é inferência.** Ela compara duas extrações com filtros diferentes, não a mesma consulta em duas datas. A ordem de grandeza de ~1% é confiável; o número exato não. Guardar *vintages* a partir de agora resolve.
- **Os baselines rodaram no mesmo backtest dos demais.** Comparar oito modelos no mesmo conjunto de janelas cria risco de viés de seleção. O plano prevê reservar as janelas finais para confirmar o vencedor antes de fixá-lo; isso ainda não foi feito.
- **Não avaliamos o conteúdo clínico** do recorte. Se DPAC/DPA e ciclodiálise devem ou não estar no estudo é decisão de mérito da autora e do orientador, não desta auditoria.
- **Nenhum arquivo de dados foi alterado.** Os scripts de análise rodaram fora do repositório. As únicas mudanças no repositório foram mover arquivos superados para `legado/` com `git mv`, sem apagar nada, e acrescentar documentação em `docs/`.

---

## 7. O que precisa de decisão

| # | Decisão | Se for sim | Se for não | Custo |
|---|---|---|---|---|
| 1 | **A narrativa passa a apresentar valores reais ao lado dos nominais?** | O achado central muda de "o gasto quase dobrou" para "o volume cresceu 24% enquanto a remuneração real caiu 14%" | Mantém-se a leitura nominal, com a ressalva de que ela inclui inflação | Baixo: a coluna já existe |
| 2 | **Os baselines entram na comparação de modelos?** | O trabalho ganha uma seção de validação de verdade; o modelo apresentado provavelmente passa a ser Holt-Winters | O Gradient Boosting continua, sem referência que sustente a escolha | Baixo: o código está pronto |
| 3 | **A previsão passa a excluir os meses provisórios da origem?** | Projeção parte de abr/2026; total de 12 meses cai de R$ 4,94 bi para R$ 4,79 bi | A origem continua em jun/2026, subestimada em ~1% | Baixo |
| 4 | **A quebra do denominador de 2022 é marcada na série de taxas?** | Nenhuma variação de taxa cruzando 2022 é apresentada como achado | Risco de o painel afirmar um crescimento de 7,85% que é 1,95% | Baixo |
| 5 | **O texto passa a dizer "hemodiálise e acessos" em vez de "diálise"?** | O texto passa a descrever o que os dados contêm | É preciso re-extrair com DPAC e DPA, e **todos os números mudam** | Alto se for re-extração |
| 6 | **O território continua por atendimento, com ressalva?** | Ressalva ao lado de toda taxa por habitante | É preciso re-extrair por residência, e a base territorial inteira muda | Alto se for re-extração |

**Sugestão da equipe:** sim para 1, 2, 3 e 4, que são baratos e aumentam o rigor sem custo para o cronograma. Para 5, corrigir o texto em vez de re-extrair, declarando a limitação. Para 6, manter atendimento com ressalva explícita. Mas a palavra é de vocês.

---

## 8. Anexos gerados nesta etapa

| Arquivo | O que é |
|---|---|
| `docs/RECORTE-SIGTAP.md` | Os 24 procedimentos e os parâmetros de cada extração, gerados a partir do cabeçalho do TabNet |
| `docs/RECONCILIACAO-V1-V2.xlsx` | Planilha com os números lado a lado, o backtest completo e o erro por horizonte |
| `docs/RELATORIO-V1-V2.docx` | Este relatório em Word |
| `legado/README.md` | O que foi movido, por que, e o aviso sobre o arquivo de procedimentos do Ceará |
| `docs/BRIEF.md`, `docs/CRITICA-V1.md` | Etapa 0, sobre produto e interface |

---

## VAULT
- `00-SISTEMA/MEMORY_PROTOCOL.md` → o código e o dado bruto vencem a memória; correção registrada, não apagada (§5.5)
- `04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` → consulta antes de decidir; linha VAULT na entrega
- `01-PROJETOS/DialisaSUS/DECISOES.md` → gate acadêmico: nenhum número muda sem a autora e o orientador; decomposição multiplicativa; MASE; vintages
- `01-PROJETOS/DialisaSUS/CONTEXTO.md` → diagnóstico reconferido que originou esta auditoria
- `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-PROVAS-FALSAS-OU-INVENTADAS.md` → nada muda em silêncio; questões de escopo se reportam
- `02-CONHECIMENTO/AGENT-WEB/CONTEXTO-E-CONFIABILIDADE-DA-DECISAO.md` → fato, estimativa e limite declarados com data e fonte
- `02-CONHECIMENTO/PRINCIPIOS/SOURCE-FIRST-UI.md` → `integrar_ibge.py` reaproveitado e auditado, não recriado
- Fonte externa declarada (lacuna do Vault em análise de dados): método das skills `data:statistical-analysis` e `data:validate-data`, **não instaladas nesta sessão** — o procedimento que elas prescrevem foi executado manualmente
