# Handoff: Aferidor · Onda 1 — Vintages, Provisório e Validações

- **Autor:** Aferidor (Claude Code)
- **Data:** 2026-09-15
- **Branch:** `worktree-distributed-plotting-quail` (merge para `remodelacao-v2`)
- **Status:** ✅ Concluído

---

## Resultado

Todas as 4 subtarefas executadas com sucesso. Critérios de aceite atendidos:

1. `python scripts/validar_dados.py` — executa e passa sem erros
2. `python -m unittest discover -s tests` — 1 teste, passa 100%
3. `dados_brutos/vintages/2026-09-15/MANIFESTO.md` — 8 extrações listadas com metadados
4. Coluna `provisorio` — marca exatamente 2 meses (`2026-05`, `2026-06`)
5. Nenhum número histórico alterado

---

## Decisões

| # | Decisão | Justificativa |
| --- | --- | --- |
| D1 | Janelas de backtest derivadas dinamicamente a partir da data máxima da série | Elimina a dependência de constante mágica "43" que quebraria com novos dados |
| D2 | Reconciliação territorial verificada por ano completo (2015–2025) | Confirma que Σmunicipal = Σnacional, sem year parcial |
| D3 | `custo_medio` verificado como Σvalor ÷ Σquantidade (não média de médias) | Alinhado ao padrão PADRAO-DATAVIZ-ACESSIVEL do Vault |
| D4 | Contagem de municípios IBGE rastreada (5570→5571) como registrada, não corrigida | Questão de escopo reportada, não silenciosa |
| D5 | Red flag de variação mensal > 50% incluída no validador | Detector precoce de anomalias na série |
| D6 | Vintages criados apenas para as 8 extrações TabNet (não IBGE/IPCA) | IBGE e IPCA são fontes complementares, não extrações TabNet |

---

## Evidências

### Vintages e Manifesto
- **OBSERVADO:** 8 arquivos TabNet copiados para `dados_brutos/vintages/2026-09-15/`
- **OBSERVADO:** MANIFESTO.md lista período, 24/25 procedimentos e linha Procedimento completa
- **MEDIDO:** 4 arquivos principais = 24 procedimentos; 4 de atualização = 25 (com transporte)

### Dados Provisórios
- **MEDIDO:** Coluna `provisorio` = True para exatamente `2026-05-01` e `2026-06-01`
- **MEDIDO:** 136 registros com `provisorio = False`, 2 com `True`
- **OBSERVADO:** `dicionario_dados.md` atualizado com definição e justificativa

### Evolução do Validador
- **MEDIDO:** `metricas["recortes"].eq(43)` substituído por cálculo dinâmico: `len(date_range(FIRST_BACKTEST, max_date - 11m))`
- **MEDIDO:** Reconciliação territorial: Σmunicipal = Σnacional para todos os anos 2015–2025 (diff < R$1)
- **MEDIDO:** `custo_medio` = `valor_aprovado / qtd_aprovada` verificado linha a linha (diff < R$0,01)
- **MEDIDO:** Join populacional: 100% de cobertura no recorte 2015–2025 (5478/5478)
- **MEDIDO:** Municípios IBGE: 5570 em 2015–2024, 5571 em 2025
- **MEDIDO:** Variação mensal máxima de quantidade: ≤ 50%

### RECORTE-SIGTAP
- **OBSERVADO:** Regenerado a partir do cabeçalho `Procedimento:` do `valor_mensal_dialise_brasil.csv`
- **OBSERVADO:** 24 códigos SIGTAP documentados em tabela

---

## VAULT

- `VAULT: 00-SISTEMA/MEMORY_PROTOCOL.md → Handoff registra decisões com justificativa; código não contradiz memória`
- `VAULT: 04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md → Vault consultado antes de decidir; handoff inclui linhas VAULT`
- `VAULT: 01-PROJETOS/DialisaSUS/CONTEXTO.md → Unidade = procedimentos; provisório = 2 meses com menos ciclos; 43 janelas é britânico; CICLODIALISE é falso positivo`
- `VAULT: 01-PROJETOS/DialisaSUS/DECISOES.md → Vintages datados; reutilizar script existente; gate acadêmico respeitado`
- `VAULT: 01-PROJETOS/DialisaSUS/ROADMAP.md → Aferidor não roda maestri; handoff em docs/handoffs/; commit [Aferidor] sem push`
- `VAULT: 02-CONHECIMENTO/PADROES/PADRAO-DATAVIZ-ACESSIVEL.md → custo_medio = Σvalor/Σqtd; provisório = hatched/opacity; denominador break visível`
- `VAULT: 02-CONHECIMENTO/AGENTES/AGENT-CONTRACT-E-HANDOFF.md → Handoff com evidências DECLARADO/OBSERVADO/MEDIDO; VAULT lines obrigatórias`

---

## Pendências

1. **Commit pendente:** alterações prontas no worktree, aguardando commit com prefixo `[Aferidor]`
2. **Merge para remodelacao-v2:** worktree precisa ser merged de volta
3. **Marco:** etapa 5 (Aferidor) concluída, desbloqueia etapa 6 (Projetista)

---

## Restrições

- Nenhum push realizado (conforme instrução)
- Nenhum número histórico da base foi alterado
- A coluna `provisorio` não altera valores, apenas classifica

---

## Arquivos Relevantes

| Arquivo | Ação |
| --- | --- |
| `dados_brutos/vintages/2026-09-15/` | **CRIADO** — 8 extrações TabNet + MANIFESTO.md |
| `dados_tratados/dialise_mensal_brasil_total.csv` | **MODIFICADO** — coluna `provisorio` adicionada |
| `scripts/tratamento_mensal_dialise.py` | **MODIFICADO** — emite coluna `provisorio` |
| `scripts/validar_dados.py` | **REESCRITO** — 15 validações (era 8), janelas dinâmicas |
| `docs/dicionario_dados.md` | **MODIFICADO** — definição de provisório adicionada |
| `docs/RECORTE-SIGTAP.md` | **REGENERADO** — 24 procedimentos SIGTAP do cabeçalho TabNet |

---

## Riscos

- **Revisão de provisórios:** Quando o DATASUS publicar a extração definitiva de Mai–Jun/2026, os valores podem divergir ~1%. Isso afeta diretamente a acurácia do modelo preditivo.
- **CICLODIALISE (0405050054):** Código dentro do recorte, mas possivelmente falso positivo. Escopo aberto, reportado, não corrigido silenciosamente.

---

## Próximos Passos

1. Fazer commit no worktree com mensagem `[Aferidor] ...`
2. Merge para `remodelacao-v2`
3. Desbloquear etapa 6 (Projetista)
