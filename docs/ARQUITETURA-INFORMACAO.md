# Arquitetura de Informação — DialisaSUS v2

**Responsável:** Retícula (Direção Criativa e UX)  
**Data:** 2026-09-15  
**Base conceitual:** `docs/BRIEF.md`, `docs/CRITICA-V1.md` e AI-Vault (`PADRAO-ARQUITETURA-LANDING-PAGE.md`, `PADRAO-DATAVIZ-ACESSIVEL.md`, `HIERARQUIA-DE-CONTEXTO-DOS-AGENTES.md`).

---

## 1. Visão Geral e Princípios Diretores

A arquitetura da v1 sofria de três falhas estruturais diagnosticadas em `docs/CRITICA-V1.md`:
1. **Ausência de hierarquia editorial:** Tratava a home como um mosaico de 4 KPIs idênticos e repetia blocos entre abas.
2. **Duplicação de gráficos entre seções:** Gráficos de série anual e composição por grupo disputavam atenção simultaneamente na "Visão Geral" e na aba "Temporal".
3. **Hipertrofia do Território:** A aba territorial tentava ser um segundo dashboard completo dentro de uma aba.

Na v2, **o produto deixa de ser um agregador de abas e passa a ser a publicação estruturada da resposta à pergunta norteadora do TCC**, desdobrada em rotas com funções singulares, canônicas e com URLs próprias (sem hash routing `#/`).

```text
                                  ┌─────────────────────────────┐
                                  │      / (Home / Relatório)   │
                                  │  Resposta à Pergunta do TCC │
                                  └──────────────┬──────────────┘
                                                 │ CTA Primário: "Explorar sua UF"
                                                 ▼
        ┌────────────────────────────────────────┼────────────────────────────────────────┐
        │                                        │                                        │
        ▼                                        ▼                                        ▼
┌──────────────────┐                   ┌──────────────────┐                    ┌──────────────────┐
│   /explorar/     │                   │   /previsao/     │                    │  /metodologia/   │
│   Instrumento    │                   │   Instrumento    │                    │  Transparência   │
│   Territorial    │                   │    Preditivo     │                    │    e Recorte     │
└──────────────────┘                   └──────────────────┘                    └──────────────────┘
        │
        ▼
┌──────────────────┐                   ┌──────────────────┐
│ /explorar/uf/:uf │                   │   /assistente/   │
│ Ficha Canônica   │                   │    Consulta      │
│  do Território   │                   │   Estruturada    │
└──────────────────┘                   └──────────────────┘
```

---

## 2. Mapa Canônico de Rotas e Responsabilidades

Cada rota possui uma **função única de conversão ou consulta**, sem sobreposição:

| Rota | Nome | Audiência Primária | Função Única | O que NÃO faz |
|---|---|---|---|---|
| `/` | **Relatório Vivo (Home)** | Leitor geral, banca, gestor | Conduzir a narrativa cronológica e analítica da década de diálise no SUS em 6 capítulos estruturados. | Não serve para consulta aprofundada de um município individual nem para testes de hiperparâmetros de modelos. |
| `/explorar/` | **Explorador Territorial** | Gestor estadual e municipal | Instrumentar a análise geográfica comparativa das 27 UFs e 498 municípios de atendimento. | Não re-executa a narrativa histórica nacional nem repete a série temporal mensal. |
| `/explorar/uf/:uf` | **Ficha do Território** | Gestor local, pesquisador | Apresentar o perfil consolidado, série histórica específica e municípios polos da UF informada. | Não projeta gastos futuros da UF (o modelo preditivo é nacional). |
| `/previsao/` | **Laboratório Preditivo** | Banca acadêmica, planejador SUS | Demonstrar o comportamento preditivo para os próximos 12 meses, auditoria de erro por horizonte e comparação com baselines. | Não faz afirmação de certeza clínica nem omite faixas de incerteza empírica. |
| `/assistente/` | **Assistente de Dados** | Usuário técnico, gestor | Responder a perguntas factuais diretas a partir do `dossie.json` estruturado, com citações da fonte. | Não busca na internet, não gera conselhos médicos e não inventa dados fora da base. |
| `/metodologia/` | **Metodologia e Reprodutibilidade** | Banca examinadora e orientador | Documentar os 24 códigos SIGTAP, limitações de extração, regimes de população IBGE, quebra de denominador e citação ABNT. | Não é vitrine promocional; é o caderno de auditoria técnica. |

> **Nota sobre rotas descontinuadas:**
> A rota de **Triagem de Risco Renal** foi **formalmente removida do escopo do produto** por decisão soberana da autora e do orientador em 15/09/2026. A plataforma de gestão pública não realiza triagem clínica individual.

---

## 3. Estrutura Capitular do Relatório Vivo (`/`)

A página inicial segue o fluxo canônico de conversão do conhecimento (`PADRAO-ARQUITETURA-LANDING-PAGE.md` adaptado a relatório científico: **Pergunta → Evidência → Mecanismo → Território → Projeção → Limites → Ação**):

### Capítulo 1: A Pergunta & O Recorte
- **Função:** Estabelecer a pergunta norteadora e as três regras invioláveis.
- **Destaque:** **Número-Herói** de R$ 52,74 bilhões reais (R$ 40,03 bi nominais) e 187,95 milhões de procedimentos (01/2015 a 06/2026).
- **Invariante em destaque:** *"Procedimento não é paciente. Uma pessoa em hemodiálise realiza até 13 procedimentos por mês."*

### Capítulo 2: A Evidência Temporal (Nominal vs Real)
- **Função:** Revelar o descolamento entre valor nominal e valor corrigido pela inflação (IPCA jun/2026).
- **Conteúdo Analítico:** O crescimento nominal de +88,61% entre 2015 e 2025 se reduz a **+11,34% em valores reais**.
- **Artefato Visual:** Gráfico 1 (Série Temporal Mensal 2015–2026 com dupla linha: nominal vs real de jun/2026, com os dois meses provisórios de mai-jun/2026 identificados por hachura).

### Capítulo 3: O Mecanismo do Crescimento (Volume vs Remuneração)
- **Função:** Decompor matematicamente a expansão dos custos.
- **Conteúdo Analítico:** No pré vs pós-pandemia, o volume físico aumentou +23,71%, enquanto a remuneração real por procedimento **caiu −13,74%** (em termos nominais subiu +22,28%). O SUS financiou mais sessões com tabela defasada.
- **Artefato Visual:** Gráfico 2 (Dumbbell Chart de decomposição: Variação de Volume vs Remuneração Real vs Nominal).

### Capítulo 4: A Geografia da Assistência (Concentração vs Pressão)
- **Função:** Diferenciar volume financeiro absoluto de pressão assistencial proporcional.
- **Conteúdo Analítico:** 10 municípios concentram 21,01% de todos os recursos (R$ 7,90 bi de R$ 37,61 bi do território). Porém, as maiores taxas de procedimentos por 100 mil habitantes ocorrem em polos microrregionais.
- **Ressalva obrigatória:** *"Os dados refletem o município onde o atendimento ocorreu, não onde o paciente reside."*
- **Artefato Visual:** Gráfico 3 (Gráfico de Área/Distribuição do Top 10 vs Restante do Brasil).

### Capítulo 5: O Horizonte Preditivo (A Projeção Consciente de Erro)
- **Função:** Apresentar a previsão dos próximos 12 meses como estimativa instrumentada, não verdade consumada.
- **Conteúdo Analítico:** Backtest em 43 janelas móveis com Gradient Boosting (MAPE 5,35%, viés −4,98%) e Holt-Winters (MAPE 4,44%, viés −0,89%).
- **Artefato Visual:** Gráfico 4 (Previsão Nacional 12m com Faixa Empírica de Incerteza de 95% e linha vertical marcando o início da estimativa).

### Capítulo 6: Limites Metodológicos & Chamada à Ação Primária
- **Função:** Fechar a narrativa com honestidade intelectual e conduzir o usuário ao aprofundamento.
- **Ressalvas claras:** 24 procedimentos SIGTAP; quebra do denominador IBGE em 2022 (−4,80% na população = salto de +5,9 p.p. na taxa); dados provisórios nos meses finais.
- **Ação Primária Única (CTA):** Botão proeminente: **"Explorar sua Unidade Federativa"** direcionando para `/explorar/`.
- **CTAs contextuais secundários:** "Ver auditoria de modelos" (`/previsao/`) e "Ver catálogo de códigos SIGTAP" (`/metodologia/`).

---

## 4. Matriz de Unicidade dos Gráficos (Prova de Não-Duplicação)

Conforme determinado pela auditoria (`CRITICA-V1.md`), **nenhum componente de dados ou gráfico pode aparecer em duas rotas**. A tabela abaixo comprova a exclusividade estrita de cada artefato visual:

| ID | Nome do Gráfico / Visualização | Rota Canônica Exclusiva | Seção / Posição | Por que NÃO entra em outra rota |
|---|---|---|---|---|
| **G-01** | Série Histórica Mensal Nominal × Real (138 meses) | `/` (Home) | Cap. 2 (Evidência) | A série nacional macro serve para sustentar a narrativa histórica; o `/explorar/` foca em dados anuais territorializados. |
| **G-02** | Decomposição de Crescimento Volume × Preço (Dumbbell) | `/` (Home) | Cap. 3 (Mecanismo) | O cálculo multiplicativo é uma conclusão macroeconômica da pesquisa, irrelevante na visão municipal do explorador. |
| **G-03** | Concentração Financeira: Top 10 Municípios × Brasil | `/` (Home) | Cap. 4 (Geografia) | Na home serve para demonstrar a disparidade sistêmica; no `/explorar/` o gestor usa a tabela completa com os 498 municípios. |
| **G-04** | Resumo da Projeção 12 Meses com Faixa de 95% | `/` (Home) | Cap. 5 (Projeção) | Versão sintética com foco na decisão gestora; todos os controles interativos e baselines ficam confinados em `/previsao/`. |
| **G-05** | Mapa Coroplético do Brasil (27 UFs, 1 Matiz Sequencial) | `/explorar/` | Painel Superior | Exclusivo do instrumento explorador geográfico. Removido da home para evitar duplicidade de navegação. |
| **G-06** | Tabela Matriz Interativa dos 498 Municípios | `/explorar/` | Painel Inferior | Instrumento de busca e ordenação por colunas (Atendimento, Taxa/100k, Valor Real). Incompatível com o ritmo de leitura da home. |
| **G-07** | Série Temporal Anual da UF Selecionada (2015–2025) | `/explorar/uf/:uf` | Ficha da UF | Gráfico local renderizado exclusivamente quando uma UF específica está ativa no explorador. |
| **G-08** | Gráfico de Erro por Horizonte de Previsão (Meses 1 a 12) | `/previsao/` | Seção Auditoria | Gráfico técnico que exibe a progressão do MAPE e viés por horizonte de projeção. Exclusivo de `/previsao/`. |
| **G-09** | Comparativo de Modelos: Gradient Boosting × Baselines | `/previsao/` | Seção Benchmarks | Comparação de barras pareadas de MAPE e viés entre os 4 modelos. Exclusivo de `/previsao/`. |
| **G-10** | Diagrama de Linhagem e Regimes de Dados (Pipeline) | `/metodologia/` | Seção Fontes | Diagrama de blocos documentando a transição Censo 2010 → Censo 2022 e a exclusão do grupo 08 (transporte). Exclusivo de `/metodologia/`. |

---

## 5. Regras de Acessibilidade e Degradação Graciosa

Em conformidade com `PADRAO-DATAVIZ-ACESSIVEL.md` e `SEO-3D-WEBGL-DUAL-LAYER.md`:
1. **Semântica Dual:** Todo gráfico `G-01` a `G-09` é envolvido em `<figure role="region" aria-labelledby="...">`.
2. **Figcaption com Síntese:** O `<figcaption>` traz obrigatoriamente a leitura literal do número central e o achado.
3. **Tabela Gêmea no HTML Inicial:** Imediatamente após o canvas/svg, existe um bloco `<details>` contendo a tabela HTML com os dados exatos daquele gráfico, garantindo legibilidade para leitores de tela e total funcionamento com JavaScript desabilitado.
4. **Interação por Teclado:** A seleção geográfica primária no `/explorar/` é operada por um `<select>` padrão acessível; o mapa em SVG funciona como realce visual e foco sincronizado, não como barreira exclusiva de clique.
