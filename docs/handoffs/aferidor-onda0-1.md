# Handoff: Aferidor — Onda 0.1 (Caminho Crítico)

**Agente:** Aferidor  
**Data:** 2026-09-16  
**Branch:** `worktree-peaceful-dazzling-gosling` (commit `c17071e` + alterações Working Tree) — correção originada aqui  
**Tarefa:** `docs/tarefas/aferidor-onda0-1.md`  
**Plano:** `docs/PLANO-V3-CONCEITO-C.md` §3.2–3.4  
**Reconciliação:** `docs/tarefas/aferidor-onda0-recuperacao.md` — checkout principal `C:\Users\Antonio\Desktop\dialisasus`, branch `remodelacao-v2`, SHA-base `36be214`. Código dos 4 scripts (`tratamento_municipio_dialise.py`, `tratamento_mensal_dialise.py`, `integrar_ibge.py`, `validar_dados.py`) confirmado idêntico entre a worktree e o checkout principal; `validar_dados.py` do checkout principal já preserva integralmente o bloco 16 da Bússola (Holt-Winters/evidência) somado às asserções desta Onda 0.1. Pipeline reexecutado do zero no checkout principal (5 passos) e `validar_dados.py` passou sem erros.  

---

## 1. Resumo da correção

O defeito de coerção (`br_number_to_float` em `scripts/tratamento_municipio_dialise.py:27` e `scripts/tratamento_mensal_dialise.py:40`) converte o caractere `-` do TabNet — que significa "sem registro no período" — em `0.0`. Combinado com `.fillna(0)` em múltiplos pontos下游, a ausência de registro ficava indistinguível de zero observado.

**Consequência documentada** (DECISOES.md, 2026-09-15 noite): "sem registro, zero observado e ano ausente da extração são três estados distintos e precisam sobreviver ao pipeline até a interface; nenhuma figura, taxa ou variação percentual pode tratar o primeiro como o segundo."

---

## 2. Arquivos modificados

| Arquivo | Escopo da mudança |
|---|---|
| `scripts/tratamento_municipio_dialise.py` | `br_number_to_float` retorna `NaN` para `'-'`; novo `classify_cell_state()` antes da conversão numérica; `combinar_estado()` para merge de estado valor/qtd; `build_indicators` com `min_count=1` em `.sum()`; `main()` com `fillna(0)` condicional ao estado |
| `scripts/tratamento_mensal_dialise.py` | Mesmo padrão: `classify_cell_state()` antes de `br_number_to_float`; `estado_registro` no `dialise_mensal_brasil_por_grupo.csv`; fillna(0) condicional |
| `scripts/integrar_ibge.py` | `min_count=1` no `sum()` de `valor_real_periodo`; propagação de `estado_registro_2025` para indicadores; idempotência verificada (dupla execução) |
| `scripts/validar_dados.py` | 13 novas asserts para estados, fillna condicional, anos excluidos, e subperíodos vazios |

---

## 3. Evidências medias

### 3.1 Baseline reproduzido

| Métrica | Esperado (tarefa) | Medido | Status |
|---|---|---|---|
| Células sem_registro em 2015–2025 | 673 de 5.478 (12,3%) | 673 de 5.478 (12,3%) | ✅ |

### 3.2 Proof points — municípios com buraco intermitente

| Município | Padrão observado | Confirmado |
|---|---|---|
| PARNAMIRIM/RN | sem_registro 2023–2025, provisorio 2026 | ✅ (`estado_2023`=`sem_registro`, `estado_2024`=`sem_registro`, `estado_2025`=`sem_registro`) |
| MAUÁ/SP (cod. 352940) | observado 2015 (3.046 proced., R$ 546.693,08 nominal / R$ 970.622,29 real), `sem_registro` 2016–2023 (8 anos consecutivos), retorno em 2024 (1.639 proced., R$ 460.274,04 real) e observado em 2025 (12.955 proced., R$ 3.341.233,05 real) | ✅ (`estado_2015`=`observado`, `estado_2025`=`observado`); valor real de 2015 (R$ 970.622,29) fica **abaixo** do corte de R$ 2.000.000 — Mauá **não integra** a coorte de 393 municípios; entre 2015 e 2025 o valor real **cresceu** (não é uma das 161 quedas) |
| ESTRELA/RS | observado 2015, buraco 2016–2021, retorno 2022 (1.464) e observado em 2025 (10.857 proced.) | ✅ (`estado_2015`=`observado`, `estado_2025`=`observado`) |


> **Correção de escopo (Regra 7 e Regra 2 do projeto):** a versão anterior deste handoff descrevia Mauá com R$ 13,9M em 2015, buraco 2017–2024 e R$ 2,9M em 2025 — nenhum desses três números bate com `municipio_dialise_brasil_long.csv` (cod. 352940) apos a reexecução do pipeline no checkout principal. Os números corretos, extraídos diretamente do CSV tratado, estão na linha acima; o padrão real é 2015 observado → 2016–2023 `sem_registro` (8 anos) → 2024 observado → 2025 observado, com crescimento real no período, e Mauá está fora da coorte de R$ 2M+ em 2015. Reportado em vez de silenciosamente sobrescrito, conforme a auditoria `AUDITORIA-SQUAD-REMODELACAO-2026-09-16.md` que sinalizou esta contradição.

### 3.3 Coorte Municipal de 2015 (R$ 2M+ em valor real corrigido)

Definição canônica aprovada: *Municípios com valor aprovado real > R$ 2.000.000 em 2015* (`valor_aprovado_real_2015 > 2_000_000`, ano-base individual, não a soma do período).

| Métrica | Antes do conserto (zeros fabricados) | Depois do conserto (base real) | Status |
|---|---|---|---|
| Municípios na coorte 2015 | 393 | **393** | ✅ Confirmado |
| Com registro em 2025 | 386 | **386** | ✅ Confirmado |
| Sem registro em 2025 | 7 (tratados como 0 e queda -100%) | **7** (`sem_registro`, variação nula) | ✅ Confirmado |
| Quedas reais (2025 vs 2015) | 168 (42,7%) | **161** (**41,71%**) | ✅ Confirmado |

### 3.4 Disambiguação dos 7 municípios sem registro em 2025

Os 7 municípios da coorte de 2015 sem registro em 2025 foram identificados e confirmados nominalmente:
1. **Assu (RN)** — cod 240020
2. **Parnamirim (RN)** — cod 240325
3. **Barra do Piraí (RJ)** — cod 330030
4. **Paracambi (RJ)** — cod 330360
5. **São Roque (SP)** — cod 355060
6. **São Sebastião (SP)** — cod 355070
7. **Joaçaba (SC)** — cod 420900

> Antes da correção, esses 7 municípios eram coagidos a `0.0`, inventando 7 quedas artificiais de −100% e inflando a proporção de quedas para 168/393 (42,75%). Com a correção, a ausência de registro é tratada como nula e a proporção de quedas é rigorosamente **161 / 386 = 41,71%**.

### 3.5 Novo achado: 6 municípios com período inteiro vazio

Seis municípios não têm **nenhum** ano com registro real em 2015–2025 — o período inteiro é sem_registro, e só aparecem com dados provisórios em 2026:

| Cod_ibge | UF | 2025 | 2026 |
|---|---|---|---|
| 230523 | CE | sem_registro | provisorio |
| 231330 | CE | sem_registro | provisorio |
| 270800 | AL | sem_registro | provisorio |
| 270840 | AL | sem_registro | provisorio |
| 320090 | ES | sem_registro | provisorio |
| 411580 | PR | sem_registro | provisorio |

> Implicação: `valor_real_periodo = NaN` e `anos_excluidos_crescimento = 10` (todos os 10 anos do período excluídos). `crescimento_valor_pos_vs_pre_pct = NaN` corretamente (subperíodo inteiramente vazio). Esta é uma instância extrema do "buraco intermitente, não terminal" descrito em DECISOES.md.

### 3.6 Subperíodos vazios e crescimento

72 municípios têm ao menos um subperíodo (pré 2015–2019 ou pós 2022–2025) inteiramente sem registro. Todos têm `crescimento_valor_pos_vs_pre_pct = NaN` — nenhuma variação percentual foi calculada sobre pares incompletos.

---

## 4. Checklist de acceptance criteria

| Critério | Status | Evidência |
|---|---|---|
| `br_number_to_float` não converte `-` em `0.0` | ✅ | Retorna `np.nan` para `'-'` e `''` |
| Cada `fillna(0)` é decisionada e comentada | ✅ | 3 ocorrências em `tratamento_municipio`, 2 em `tratamento_mensal`, todas condicionais a `estado ∈ {observado, provisorio}` |
| Coluna `estado_registro` com 5 valores no long.csv | ✅ | `municipio_dialise_brasil_long.csv` tem `estado_registro` ∈ {observado, provisorio, sem_registro} (ausente e estimado não ocorrem neste recorte, mas são permitidos) |
| Coluna `estado_registro_2025` no indicadores | ✅ | `indicadores_municipio_brasil.csv` tem `estado_registro_2025` |
| `integrar_ibge.py` preserva coluna na reescrita | ✅ | Idempotência verificada (dupla execução) |
| Variação percentual exclui pares com sem_registro/ausente | ✅ | 72 municípios com subperíodo vazio; todos com crescimento NaN |
| Asserts em `validar_dados.py` | ✅ | 13 novas asserts, validador passa sem erros |
| 7 municípios sem registro em 2025 aparecem como `sem_registro` | ✅ | `estado_registro_2025` = `sem_registro`, não `0`; nomes confirmados em §3.4 (Assu, Parnamirim, Barra do Piraí, Paracambi, São Roque, São Sebastião, Joaçaba) |
| Nenhuma variação divide sobre sem_registro/ausente | ✅ | `anos_excluidos_crescimento` bate com contagem real; crescimento NaN quando subperíodo vazio |

---

## 5. Conflito entre worktrees (risco de integração) — RESOLVIDO

**ALERTA:** Durante a execução, descobriu-se que existe um **terceiro worktree ativo** (`distributed-plotting-quail`) e que o worktree principal (`main checkout`) contém trabalho **não commitado** — uma versão avançada de `validar_dados.py` com infraestrutura de backtest/evidence que não existe no histórico git do worktree deste Aferidor.

**Risco:** quando este worktree for mergeado, haverá conflito em `validar_dados.py` (e possivelmente em `tratamento_municipio_dialise.py`), pois o main checkout tem mudanças não commitadas que precedem este trabalho.

**Recomendação ao Maestro:** antes de merge, verificar se o outro agente já commitou suas mudanças no main. Se não, o Maestro deve coordenar a reconciliação — as mudanças do Aferidor (Onda 0.1) são o caminho crítico e têm prioridade; as do outro agente (evidência/backtest) são complementares e podem ser reaplicadas sobre a base corrigida.

**Status em 2026-09-16 (Onda 0 — recuperação):** confirmado por comparação byte a byte (`diff`) que `scripts/tratamento_municipio_dialise.py`, `scripts/tratamento_mensal_dialise.py` e `scripts/integrar_ibge.py` já são idênticos entre a worktree e o checkout principal, e que `scripts/validar_dados.py` do checkout principal já contém tanto as asserções desta Onda 0.1 quanto o bloco 16 da Bússola (constantes `HORIZON`/`FIRST_BACKTEST`/`OFFICIAL_MODEL`/`EVIDENCE_TARGETS` e as validações de evidência Holt-Winters/dois-alvos/horizonte) — nenhuma sobrescrita foi necessária. Pipeline reexecutado do zero no checkout principal; `validar_dados.py` passou sem erros. Conflito considerado resolvido nesta reconciliação.

---

## 6. O que NÃO foi feito (escopo declarado)

- As asserts do §3.4 relacionadas ao dossiê (`dossie/*.json`) não foram implementadas — dependem da Onda 2.1.
- O `ROADMAP.md` do Vault foi consultado mas não modificado (era leitura obrigatória, não tarefa de escrita).
- Nenhum commit/push foi feito (regra do projeto: "Nenhum commit, push ou deploy sem autorização explícita do usuário").

---

## 7. VAULT: notas aplicadas

```
VAULT: 00-SISTEMA/MEMORY_PROTOCOL.md → Protocolo de leitura (DECISOES.md obrigatório antes de decidir) e de escrita (entrega com VAULT obrigatório)
VAULT: 04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md → Regra soberana: consultar Vault antes de decidir, registrar VAULT em toda entrega
VAULT: 01-PROJETOS/DialisaSUS/ROADMAP.md → Onda 0 desbloqueada; Aferidor é dono; Onda 0.1 bloqueia toda produção de número
VAULT: 01-PROJETOS/DialisaSUS/DECISOES.md → Cinco estados do dado (§3.2); "sem registro ≠ zero observado ≠ ausente"; regra de reversa (decisão revertida volta ao Vault antes de trabalho dependente)
VAULT: 02-CONHECIMENTO/PADROES/PADRAO-DATAVIZ-ACESSIVEL.md §8.1 → Três estados (observado/estimado/provisório) estendidos para cinco (adição de sem_registro e ausente)
VAULT: 02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-PROVAS-FALSAS-OU-INVENTADAS.md → Regra Soberana de Prova Real: não fabricar dados, declarar ausência explicitamente
VAULT: 02-CONHECIMENTO/PADROES/PADRAO-TAREFA-EM-ARQUIVO-COM-ACEITE.md → Tarefa em arquivo com critérios de aceitação observáveis e base obrigatória no Vault
VAULT: 01-PROJETOS/DialisaSUS/APRENDIDOS.md (2026-09-16) → worktree divergente exige registrar SHA-base/branch/diretório por despacho e só considerar handoff integrado quando o mesmo teste passa no checkout de integração; coorte não pode trocar de definição em silêncio num handoff
VAULT: 01-PROJETOS/DialisaSUS/AUDITORIA-SQUAD-REMODELACAO-2026-09-16.md §Aferidor → confirmou os dois erros desta entrega (coorte redefinida para soma do período, contradição em Mauá) e a contraprova independente 393/386/7/161/41,71%; ambos corrigidos nesta reconciliação
```
