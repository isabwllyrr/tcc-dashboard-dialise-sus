# Copy estruturada das 7 rotas — DialisaSUS

> **Status:** Pendente de aprovação da autora (Gate G-D). Nenhum texto aqui é definitivo até aprovação.
>
> **Fonte de todos os números:** `dossie/nacional.json`, `dossie/territorio/*.json`, `dossie/modelo.json`. Nenhum número foi digitado à mão.
>
> **Autoria:** PENDÊNCIA — nome da autora substituído por indicação de pendência documental até confirmação verificável (AUDITORIA-SQUAD §Retícula). Orientação e instituição: não supostos.

---

## Ordem interna canônica (§4 do plano)

Cada rota segue esta sequência, sem exceção:

1. **Resposta** direta à pergunta norteadora da rota
2. **Alcance** — o que a afirmação demonstra e o que não demonstra
3. **Aviso pré-figura** — "Esta base conta procedimentos aprovados, não pessoas. Uma pessoa pode realizar vários procedimentos."
4. **Contexto** — período, unidade, período de cobertura
5. **Como foi calculada** — fontes e métodos, no próprio documento
6. **O que a enfraquece** — limites e ressalvas (por ID do `ressalvas.json`)
7. **Próxima pergunta** — endereço da rota seguinte

---

## Rota `/` — Home

### 1. Resposta

O volume de procedimentos aprovados de diálise cresceu de 2015 a 2025, tanto em termos nominais quanto reais. Porém, o valor real médio por procedimento caiu no mesmo período — a remuneração perdeu da inflação.

### 2. Alcance

O que esta afirmação demonstra:
- Crescimento do volume aprovado de procedimentos ao longo de uma década.
- Queda do poder de compra da remuneração por procedimento, medida pelo IPCA.

O que **não** demonstra:
- Aumento do número de pacientes (procedimentos ≠ pessoas).
- Corte na tabela SUS (isso é SIGTAP, não SIA).
- Aumento do custo de operação das unidades.
- Causalidade da pandemia sobre os valores.

### 3. Aviso pré-figura

*Esta base conta procedimentos aprovados, não pessoas. Uma pessoa pode realizar vários procedimentos.*

### 4. Contexto

- **Período:** janeiro de 2015 a junho de 2026 (138 meses).
- **Anos completos para comparação:** 2015–2025 (11 anos).
- **Unidade de análise:** procedimentos aprovados por local de atendimento.
- **Fonte:** SIA/SUS, consultado pelo TabNet do DATASUS.

### 5. Como foi calculada

Números da home vêm de `nacional.json`:
- **2015–2025, valor aprovado:** +88,61% nominal / +11,34% real (chave: `variacao_valor_2015_2025`).
- **Pré-pandemia (2015–2019) → Pós-pandemia (2022–2025):**
  - Quantidade média mensal: +23,71%.
  - Valor médio por procedimento: +22,28% nominal / −13,74% real (chave: `variacao_valor_real_por_procedimento`).

Os valores reais usam IPCA com base em jun/2026 (`valor_real = nominal × fator_correcao`).

### 6. O que a enfraquece

- `r.procedimento_nao_pessoa`: o crescimento não implica aumento equivalente de pacientes.
- `r.atendimento`: os dados são por local de atendimento, não residência — polos regionais inflam a taxa.
- `r.mix`: o valor médio por procedimento pode variar por mudança de composição entre tipos de procedimento.
- `r.provisorio`: jun/2026 é provisório, subestimado em ~1%.

### 7. Próxima pergunta

"O volume cresceu, mas o valor real caiu — como a quantidade se distribui no tempo?"

→ Rota `/evidencias/contagem/`

---

## Rota `/evidencias/contagem/` — O que a base conta?

### 1. Resposta

A quantidade de procedimentos aprovados de diálise cresceu ao longo da série, com variações mensais e sazonalidade. Os meses mais recentes são provisórios e tendem a ser revistos.

### 2. Alcance

O que esta afirmação demonstra:
- A evolução temporal da quantidade de procedimentos aprovados.
- A presença de sazonalidade na série mensal.

O que **não** demonstra:
- Quantas pessoas estão em diálise.
- Se a capacidade instalada acompanhou o crescimento.

### 3. Aviso pré-figura

*Esta base conta procedimentos aprovados, não pessoas. Uma pessoa pode realizar vários procedimentos.*

### 4. Contexto

- **Figura:** G3 — série mensal de quantidade, jan/2015 a jun/2026.
- **Dossiê:** `nacional.json` → `g3_quantidade_mensal`.
- **Estado dos últimos meses:** provisório (hachura na interface).

### 5. Como foi calculada

A quantidade aprovada vem da coluna `qtd_aprovada` dos CSVs tratados, agregada nacionalmente. A série é contínua de jan/2015 a jun/2026.

### 6. O que a enfraquece

- `r.provisorio`: mai e jun/2026 são provisórios, subestimados em ~1%.
- `r.procedimento_nao_pessoa`: quantidade ≠ número de pacientes.

### 7. Próxima pergunta

"O volume cresceu, mas o valor real por procedimento caiu — como o valor nominal se compara ao real?"

→ Rota `/evidencias/valor/`

---

## Rota `/evidencias/valor/` — Mais valor nominal é a mesma expansão em termos reais?

### 1. Resposta

Não. O valor nominal aprovado cresceu significativamente entre 2015 e 2025 (+88,61%), mas em termos reais (corrigido pelo IPCA) o crescimento foi menor (+11,34%). O valor real médio por procedimento caiu 13,74% entre o período pré-pandemia e o pós-pandemia.

### 2. Alcance

O que esta afirmação demonstra:
- A inflação explicou parte do crescimento nominal do valor aprovado.
- O poder de compra da remuneração por procedimento diminuiu.

O que **não** demonstra:
- Corte na tabela SUS (é SIGTAP).
- Aumento do custo de operação.
- Perda de qualidade do serviço.
- Causalidade da pandemia.

### 3. Aviso pré-figura

*Esta base conta procedimentos aprovados, não pessoas. Uma pessoa pode realizar vários procedimentos.*

### 4. Contexto

- **Figuras:** G1 (valor anual, nominal e real) e G2 (dumbbell pré vs pós-pandemia).
- **Dossiê:** `nacional.json` → `g1_valor_anual` e `g2_medias_periodo`.
- **Base de correção:** IPCA SIDRA, tabela 7060, base jun/2026.

### 5. Como foi calculada

- **G1:** Valor anual aprovado, em reais nominais e reais de jun/2026. Eixo único em R$.
- **G2:** Média do valor por procedimento nos períodos pré-pandemia (2015–2019) e pós-pandemia (2022–2025), em nominal e real.
- **Fórmula:** `valor_real = valor_nominal × fator_correcao_ipca`.
- As duas comparações temporais têm períodos diferentes e **não formam uma decomposição única**.

### 6. O que a enfraquece

- `r.mix`: o valor médio por procedimento pode variar por mudança de composição entre tipos, sem mudança de preço.
- `r.provisorio`: dados de 2026 são provisórios.
- `r.denominador_2022`: a correção IPCA não afeta o denominador, mas a interpretação do valor real depende da base de referência.

### 7. Próxima pergunta

"Onde os procedimentos foram aprovados para atendimento?"

→ Rota `/evidencias/territorio/`

---

## Rota `/evidencias/territorio/` — Onde os procedimentos foram aprovados para atendimento?

### 1. Resposta

A distribuição territorial dos procedimentos aprovados é desigual. A taxa por 100 mil habitantes varia significativamente entre UFs e municípios, refletindo tanto a concentração de serviços quanto o efeito de polos regionais que atendem pacientes de outros municípios.

### 2. Alcance

O que esta afirmação demonstra:
- A concentração territorial dos procedimentos aprovados.
- A variação da taxa por habitante entre unidades da federação.

O que **não** demonstra:
- Onde os moradores de um município são atendidos (o dado é por local de atendimento).
- Se há capacidade instalada suficiente (é CNES).
- Se existe fila reprimida (não consta na base).

### 3. Aviso pré-figura

*Esta base conta procedimentos aprovados, não pessoas. Uma pessoa pode realizar vários procedimentos.*

### 4. Contexto

- **Figuras:** G4 (mapa coroplético por UF, um ano por vez) e G5 (série temporal por UF selecionada).
- **Dossiê:** `territorio/indice.json` + `territorio/uf-<UF>.json`.
- **Território:** 498 municípios com registros, comparáveis em 2015–2025.

### 5. Como foi calculada

- **G4:** Quantidade aprovada agregada por UF para um ano selecionado. Mapa sequencial de 1 matiz, no máximo 7 classes. Tabela é o acesso principal.
- **G5:** Série anual de valor aprovado para a UF selecionada, em nominal e real.
- **Taxa por 100 mil hab.:** quantidade ÷ população IBGE × 100.000. População: estimativas anuais, Censo 2022, interpolação para 2023.

### 6. O que a enfraquece

- `r.atendimento`: polos regionais têm taxa inflada por atender pessoas de outros municípios.
- `r.denominador_2022`: a quebra populacional em 2022 causa artefato na taxa.
- `r.populacao_2023`: população de 2023 é interpolação.
- `r.sem_registro`: municípios sem registro em determinados anos não são zero — podem reaparecer.

### 7. Próxima pergunta

"Como o valor evoluiu na UF selecionada?"

→ Rota `/evidencias/territorio/<uf>/`

---

## Rota `/evidencias/territorio/<uf>/` — Como o valor evoluiu na UF selecionada?

### 1. Resposta

A evolução do valor aprovado varia por UF. Alguns municípios apresentam crescimento consistente, outros têm períodos sem registro que reaparecem em anos seguintes — ausência de registro não é fechamento de serviço.

### 2. Alcance

O que esta afirmação demonstra:
- A trajetória temporal do valor aprovado na UF e em seus municípios.

O que **não** demonstra:
- Prevalência de doença renal na UF.
- Se a UF tem capacidade suficiente.

### 3. Aviso pré-figura

*Esta base conta procedimentos aprovados, não pessoas. Uma pessoa pode realizar vários procedimentos.*

### 4. Contexto

- **Rota:** `/evidencias/territorio/<uf>/` (27 páginas estáticas, uma por UF).
- **Dossiê:** `territorio/uf-<UF>.json`.
- **Estado de URL:** `/evidencias/territorio/<uf>/<ano>/`

### 5. Como foi calculada

Série anual de valor aprovado por município da UF, com população e taxa por 100 mil hab. Sem opção "Brasil" (que republicaria G1).

### 6. O que a enfraquece

- `r.atendimento`: o dado é por local de atendimento.
- `r.sem_registro`: municípios com traço em anos intermediários podem reaparecer — ver PARNAMIRIM no glossário (nota estendida).
- `r.denominador_2022` e `r.populacao_2023`: artefatos no denominador populacional.

### 7. Próxima pergunta

"Como as trajetórias municipais se distribuem entre queda e crescimento?"

→ G7 (proposta, sujeita a gate G-F) — texto e tabela gêmea na mesma rota.

---

## Rota `/evidencias/modelo/` — Em que condições o modelo funciona e onde perde?

### 1. Resposta

O modelo de Gradient Boosting apresenta o menor erro médio percentual (MAPE) entre os modelos avaliados, mas tende a subestimar os valores observados (viés negativo). A previsão é exploratória e não deve ser tratada como determinação exata do gasto futuro.

### 2. Alcance

O que esta afirmação demonstra:
- O desempenho relativo dos modelos supervisionados em janelas temporais de backtest.
- A tendência de subestimação do melhor modelo.

O que **não** demonstra:
- Que o gasto futuro será exatamente o projetado.
- Que o modelo captura todos os fatores que influenciam a série.

### 3. Aviso pré-figura

*Esta base conta procedimentos aprovados, não pessoas. Uma pessoa pode realizar vários procedimentos.*

### 4. Contexto

- **Figura:** G6 — viés por horizonte de previsão.
- **Dossiê:** `modelo.json` → `comparacao_modelos`, `vies_por_horizonte`, `previsao_12m`.
- **Protocolo:** backtest em janelas móveis de 12 meses; alvo é valor real; features temporais.

### 5. Como foi calculada

- **Backtest:** janelas móveis de 12 meses desde jan/2022.
- **Modelos avaliados:** Regressão Linear, Ridge, Random Forest, Gradient Boosting.
- **Métrica principal:** MAPE médio, MAPE mediano, MASE, viés médio.
- **Faixa de 95%:** calculada a partir dos erros do backtesting, por horizonte.
- **Projeção:** jul/2026 a jun/2027, com faixa empírica.

### 6. O que a enfraquece

- `r.mape`: MAPE é erro médio do backtest, não garantia sobre o futuro.
- `r.provisorio`: a origem da previsão inclui meses provisórios (mai e jun/2026).
- Viés negativo: o modelo tende a prever abaixo do observado.
- Sem baselines sazonais completos (sazonal ingênuo, ETS) — pendência metodológica.

### 7. Próxima pergunta

"De onde vem esta publicação?"

→ Rota `/sobre-a-base/`

---

## Rota `/sobre-a-base/` — De onde vem esta publicação?

### 1. Resposta

O DialisaSUS é um produto tecnológico de trabalho de conclusão de curso [PENDÊNCIA: confirmação do nome da autora]. Os dados vêm do SIA/SUS (TabNet/DATASUS), com cobertura nacional de janeiro de 2015 a junho de 2026. A plataforma integra dados públicos de diálise com populações do IBGE e deflator IPCA.

### 2. Alcance

O que esta seção demonstra:
- A origem documentada de cada dado e método usado no produto.

O que **não** demonstra:
- Que o produto é uma publicação oficial do SUS, DATASUS ou IBGE.
- Que os dados passaram por revisão institucional além do TabNet.

### 3. Aviso pré-figura

*Esta base conta procedimentos aprovados, não pessoas. Uma pessoa pode realizar vários procedimentos.*

### 4. Contexto

- **Fonte principal:** SIA/SUS, TabNet do DATASUS.
- **Dados auxiliares:** população IBGE (estimativas anuais, Censo 2022), IPCA (SIDRA tabela 7060).
- **Cobertura temporal:** jan/2015 a jun/2026 (138 meses; 11 anos completos + 6 meses parciais).
- **Cobertura territorial:** 498 municípios com registros.
- **Procedimentos:** 24 códigos SIGTAP de diálise (listados no cabeçalho de cada extração).
- **Ano parcial:** 2026 é ano incompleto; mai e jun/2026 são provisórios.
- **MINISTÉRIO DA SAÚDE, DATASUS e IBGE:** fontes de dados abertos, não chancela, realizadores ou coautores deste produto.

### 5. Como foi calculada

Documentação de cada etapa:
- Extração: TabNet/DATASUS → CSVs em `dados_brutos/`.
- Tratamento: `scripts/tratamento_mensal_dialise.py` e `scripts/tratamento_municipio_dialise.py`.
- Integração: `scripts/integrar_ibge.py` (população + IPCA).
- Validação: `scripts/validar_dados.py`.
- Modelo: `scripts/modelagem_preditiva.py`.

### 6. O que a enfraquece

- `r.atendimento`: dado é por local de atendimento, não residência.
- `r.sem_registro`: ausência de registro em município não é fechamento.
- `r.provisorio`: meses mais recentes são provisórios.
- **DPAC/DPA fora do recorte** e **0405050054 CICLODIALISE dentro** — questões de escopo abertas.
- Sem dados de CNES (capacidade instalada), SIGTAP (reajuste de tabela), Censo SBN (pacientes), PNS/SIH/SIM.

### 7. O que o produto não pode responder

Escrito no produto (§14 do plano):
- Quantos pacientes existem.
- Onde os moradores de um município são atendidos.
- Se há máquina e equipe suficientes.
- Se existe fila reprimida.
- Se a tabela SUS foi cortada.

---

## Rota `/assistente/` — Em qual evidência encontro resposta sustentada?

### 1. Resposta

O assistente interpreta os indicadores já disponíveis no dossiê e localiza a evidência correspondente em cada rota. Não cria dados, não faz diagnóstico e não substitui análise técnica.

### 2. Alcance

O que esta funcionalidade demonstra:
- Capacidade de localizar e citar a rota dona de cada número.

O que **não** faz:
- Não busca na internet.
- Não dá conselho médico.
- Não inventa número fora do dossiê.

### 3. Aviso pré-figura

*Esta base conta procedimentos aprovados, não pessoas. Uma pessoa pode realizar vários procedimentos.*

### 4. Contexto

- **Rota:** `/assistente/`
- **Tecnologia:** Netlify Function (`/api/agent`), provedor Gemini.
- **Contexto montado no servidor** a partir do dossiê.
- **Fallback sem JavaScript:** formulário POST com resposta em página.

### 5. Como foi calculada

O contexto do assistente é montado a partir do dossiê. Toda resposta cita a rota dona. O assistente usa o glossário do dossiê para termos.

### 6. O que a enfraquece

- `r.mape`: respostas sobre previsão citam o erro do backtest.
- `r.procedimento_nao_pessoa`: o assistente reforça que procedimentos ≠ pessoas.
- **Prompt injection:** conteúdo do dossiê é dado, nunca instrução.
- **Recusa clínica:** regra local antes de chamar o provedor.

### 7. Próxima pergunta

Qualquer pergunta sobre os dados é respondida com referência à rota correspondente. O assistente não substitui a leitura das evidências.

---

## Ressalvas canônicas (referência cruzada)

Todas as rotas usam as ressalvas de `dossie/ressalvas.json`:

| ID | Contexto de uso |
|---|---|
| `r.procedimento_nao_pessoa` | Todas as rotas, antes do primeiro gráfico |
| `r.atendimento` | Território (G4, G5, G7), taxas |
| `r.sem_registro` | Onde aparecer o estado `sem_registro` |
| `r.provisorio` | Séries com meses provisórios |
| `r.denominador_2022` | Taxas com série que atravessa 2022 |
| `r.populacao_2023` | Taxas com população de 2023 |
| `r.mix` | Decomposição valor (quantidade × preço × inflação) |
| `r.mape` | Rota de modelo (G6), qualquer menção a previsão |

---

## Nota sobre autoria

- **Nome da autora:** PENDÊNCIA — substituído por indicação explícita até confirmação verificável (Gate G-D). Não supor orientador nem instituição de ensino.
- **MINISTÉRIO DA SAÚDE, DATASUS e IBGE:** fontes de dados abertos. Nunca chancela, realizadores ou coautores.
- **Nenhuma frase foi inventada.** Todos os textos reproduzem fielmente o conteúdo do `TEXTO-GERAL-DO-PROJETO.md` e do `PLANO-V3-CONCEITO-C.md`. Definições que são sínteses estão marcadas como tais.
