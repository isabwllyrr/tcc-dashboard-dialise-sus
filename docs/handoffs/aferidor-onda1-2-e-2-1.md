# Handoff: Aferidor · Onda 1.2 e 2.1 — Agregação Territorial e Emissão do Dossiê

**Agente:** Aferidor  
**Data:** 2026-09-17  
**Branch:** `remodelacao-v2` (checkout principal `C:\Users\Antonio\Desktop\dialisasus`)  
**Tarefa:** `docs/tarefas/aferidor-onda1-2-e-2-1.md`  
**Contrato:** `docs/CONTRATO-DOSSIE.md` (Draft 2020-12, `dossie/schema.json`)  
**Onda anterior:** Onda 0 reconciliada e aprovada pela Contraprova (`docs/handoffs/aferidor-onda0-1.md`, `docs/handoffs/contraprova-onda0-2.md`)

---

## DECLARADO

A tarefa formalizou para as Ondas 1.2 e 2.1 no checkout principal `C:\Users\Antonio\Desktop\dialisasus`:

1. **Onda 1.2 — Agregação territorial e trajetórias:**
   - Emitir `dados_tratados/dialise_uf_total_anual.csv` com a soma das 27 UFs por ano batendo 100% com o total nacional de `dialise_anual_brasil_total.csv`.
   - Emitir `dados_tratados/distribuicao_trajetorias_municipais.csv` calculando a variação real 2015→2025, excluindo municípios com `sem_registro`/`ausente` em 2015 ou 2025 e reportando a contagem de exclusões por motivo.
2. **Onda 2.1 — Emissão do Dossiê Canônico:**
   - Implementar `scripts/gerar_dossie.py` materializando: `dossie/manifesto.json`, `dossie/nacional.json`, `dossie/modelo.json`, `dossie/territorio/indice.json`, `dossie/territorio/distribuicao.json` e 27 arquivos `dossie/territorio/uf-<UF>.json`.
   - Preservar sem alteração `dossie/schema.json`, `dossie/glossario.json` e `dossie/ressalvas.json`.
3. **Validação e Integridade:**
   - Validar rigorosamente todos os documentos contra `dossie/schema.json` via Draft 2020-12 (`npm run check:dossie` passando com 100% de sucesso nos 34 documentos).
   - Adicionar as novas asserções de paridade CSV↔Dossiê em `scripts/validar_dados.py` e garantir que o pipeline saia com código 0.
4. **Governança:**
   - Entregar o handoff oficial em `docs/handoffs/aferidor-onda1-2-e-2-1.md` com DECLARADO, OBSERVADO, MEDIDO e linhas `VAULT: <nota> -> <regra aplicada>`.
   - Proibido commit, push ou deploy sem autorização explícita do usuário.

---

## OBSERVADO

- **Divergência de nomenclatura de arquivos CSV (Regra 7 — Questão de escopo se reporta, não se corrige em silêncio):** O contrato inicial `docs/CONTRATO-DOSSIE.md` §4 registrava provisoriamente os nomes `dialise_uf_2015_2025.csv` e `distribuicao_trajetorias_municipais_2015_2025.csv`. A especificação da tarefa e a instrução oficial do Maestro exigiram os nomes canônicos `dialise_uf_total_anual.csv` e `distribuicao_trajetorias_municipais.csv`. O script de agregação (`scripts/agregacao_territorial.py`) foi estruturado para emitir exatamente os nomes solicitados pela tarefa, e o catálogo §4 do `docs/CONTRATO-DOSSIE.md` foi atualizado em paridade na mesma entrega, em estrito cumprimento da regra do contrato: *"Os nomes finais dos dois CSVs a emitir são parte deste contrato. Se a Onda 1.2 produzir outro nome, este documento e o Schema devem mudar na mesma alteração; consumidor nenhum adivinha aliases."*
- **Taxonomia de Exclusão de Trajetórias Municipais:** Para não distorcer a variação real (evitando calcular -100% para municípios cujo serviço cessou ou divisões espúrias por zero/ausência), o pipeline categorizou 101 municípios excluídos em 4 grupos mutuamente exclusivos e auditáveis:
  1. `novo_registro` (82 municípios): sem registro/ausente em 2015, mas com procedimento observado em 2025 (expansão de rede);
  2. `sem_registro_final` (8 municípios): com registro em 2015, mas sem registro/ausente em 2025;
  3. `sem_registro_ambos` (11 municípios): sem registro/ausente em ambas as pontas 2015 e 2025;
  4. `excluido_base_zero` (0 municípios): guarda para valor base nulo/zero.
  Total de municípios comparáveis nas 7 faixas de variação: **397**. Total geral: 397 + 101 = **498 municípios** (100% da base longa de atendimento do SIA).
- **Interrupção Operacional e Validação Independente:** Durante a geração inicial dos artefatos pelo subagente, ocorreu um erro de infraestrutura na API (`HTTP 400`). Em vez de assumir conclusões por afirmação verbal, o Aferidor assumiu o controle e realizou a conferência empírica independente no checkout principal, executando a validação Draft 2020-12, a validação de dados e recalculando diretamente em pandas a reconciliação 100% de cada um dos 11 anos.

---

## MEDIDO

Evidências coletadas diretamente por execução no checkout principal `C:\Users\Antonio\Desktop\dialisasus`:

1. **Validação do Dossiê contra JSON Schema Draft 2020-12 (`npm run check:dossie`):**
   ```
   > dialisasus@1.0.0 check:dossie
   > python scripts/validar_schema_dossie.py

   Schema Draft 2020-12 valido: dossie/schema.json
   Documentos do dossie validados: 34
   ```

2. **Validação Completa do Pipeline (`python scripts/validar_dados.py` — EXIT_CODE=0):**
   ```
   Validacao concluida sem erros
   - meses: 138
   - periodo: 2015-01 a 2026-06
   - municipios: 498
   - modelo: gradient_boosting
   - mape_12m: 5.351826108996289
   - janelas_backtest: 43
   - linhas_backtest_operacional: 2064
   - modelos_evidencia: 5
   - alvos_evidencia: 2
   - uf_ano: 297
   - trajetorias_comparaveis: 397
   - trajetorias_excluidas: 101
   - documentos_dossie: 34
   ```

3. **Reconciliação Exata UF × Brasil (`dialise_uf_total_anual.csv` vs `dialise_anual_brasil_total.csv`):**
   - Linhas no CSV estadual: **297** (27 UFs × 11 anos completos 2015–2025).
   - Diferença absoluta na quantidade aprovada: **0,0** para todos os 11 anos.
   - Diferença absoluta no valor aprovado nominal: **R$ 0,00** para todos os 11 anos.
   - Reconciliação: **100,00% exata**.

4. **Distribuição das Trajetórias Municipais (`distribuicao_trajetorias_municipais.csv`):**
   - Comparáveis nas 7 faixas: `queda_maior_50` (6), `queda_25_a_50` (31), `queda_ate_25` (127), `sem_variacao` (0), `crescimento_ate_25` (124), `crescimento_25_a_50` (58), `crescimento_maior_50` (51) → **397 municípios**.
   - Exclusões categorizadas: `novo_registro` (82), `sem_registro_final` (8), `sem_registro_ambos` (11), `excluido_base_zero` (0) → **101 municípios**.
   - Soma total: 397 + 101 = **498 municípios** (bate 100% com `municipios: 498` de `validar_dados.py`).

5. **Integridade de Arquivos Protegidos:**
   - `dossie/schema.json`, `dossie/glossario.json` e `dossie/ressalvas.json` permaneceram intocados e íntegros.
   - Nenhum comando de commit, push ou deploy foi executado (Regra 8).

---

## ARQUIVOS PRODUZIDOS / CONSOLIDADOS

- `scripts/agregacao_territorial.py` (Script da Onda 1.2 — agregações por UF e trajetórias)
- `scripts/gerar_dossie.py` (Script da Onda 2.1 — emissor canônico do Dossiê estruturado)
- `scripts/validar_schema_dossie.py` (Validador Draft 2020-12 acionado via npm)
- `scripts/validar_dados.py` (Asserts integradas para UF, trajetórias e Dossiê)
- `dados_tratados/dialise_uf_total_anual.csv` (297 linhas, 27 UFs × 11 anos)
- `dados_tratados/distribuicao_trajetorias_municipais.csv` (12 linhas)
- `dossie/manifesto.json`, `dossie/nacional.json`, `dossie/modelo.json`
- `dossie/territorio/indice.json`, `dossie/territorio/distribuicao.json`
- `dossie/territorio/uf-<UF>.json` (27 arquivos estaduais)
- `docs/CONTRATO-DOSSIE.md` (§4 atualizado com nomes canônicos emitidos)
- `docs/handoffs/aferidor-onda1-2-e-2-1.md` (este documento de handoff)

---

## VAULT

VAULT: `00-SISTEMA/MEMORY_PROTOCOL.md` → Rastreabilidade da decisão e atualização formal do contrato em vez de alteração tácita ou silenciosa.
VAULT: `04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` → Consulta prévia e estruturação do trabalho ancorada nos padrões e decisões vigentes no Obsidian.
VAULT: `01-PROJETOS/DialisaSUS/DECISOES.md` (16/09 e 15/09 noite) → Aplicação estrita dos 5 estados do dado (`sem_registro`/`ausente` tratados como `null`), regra da razão de somas para taxas e princípio de que divergência se reporta.
VAULT: `01-PROJETOS/DialisaSUS/ROADMAP.md` (Onda 1 e 2) → Cumprimento do plano de emissão do dossiê canônico como interface única entre dados e interface.
VAULT: `02-CONHECIMENTO/PADROES/PADRAO-DATAVIZ-ACESSIVEL.md` → Implementação da quebra de denominador (`quebra_denominador: true`) no Censo 2022 e uso exclusivo de razão de somas para indicadores per capita e taxas por 100k hab.
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-PROVAS-FALSAS-OU-INVENTADAS.md` → Todos os números de controle foram extraídos e validados diretamente dos dados tratados e da execução do pipeline, sem fabricação ou inserção manual.
