# Handoff: Maestro — Preflight de Integração e Inventário de Worktrees

- **Papel:** Maestro (DialisaSUS · Maestro — Orquestrador)
- **Data:** 2026-09-16
- **Checkout de Integração:** `C:\Users\Antonio\Desktop\dialisasus`
- **Branch:** `remodelacao-v2`
- **SHA-base de Integração:** `36be214` (`[Vistoria] linha de base forense v1 e script unificado de auditoria de rotas`)

---

## 1. Confirmação do Ambiente e Identidade

Executado `maestri list` em 2026-09-16:
- **Workspace:** DialisaSUS
- **Identidade do orquestrador:** `name: "Maestro"`, `role: "DialisaSUS · Maestro — Orquestrador"`, `maestro: true`.
- **Especialistas conectados (11 papéis):**
  - Aferidor (Dados e Pipeline)
  - Bússola (Estatística e Previsão)
  - Escala (Visualização de Dados)
  - Retícula (Direção Criativa e UX)
  - Verbete (Narrativa, Copy Técnica e Glossário)
  - Alicerce (Arquitetura, Agente e Segurança)
  - Cadência (Motion e Scroll Narrativo)
  - Bancada (Implementação)
  - Vistoria (QA em Navegador e Acessibilidade)
  - Contraprova (Red Team e Guarda de Método)
  - Sonda (Pesquisa e Verificação de Fontes)
- **Notas do Maestri conectadas:** `dialisasus-estado`, `dialisasus-board`.

---

## 2. Inventário de Worktrees

| Diretório | Branch | SHA-base | Papel Responsável | Mudanças Pendentes / Estado |
|---|---|---|---|---|
| `C:\Users\Antonio\Desktop\dialisasus` | `remodelacao-v2` | `36be214` | **Maestro** (checkout principal de integração) | Alterações validadas de Bússola (Holt-Winters), Escala (tokens), Alicerce (Astro/Schema), Retícula (pranchas/título), sem commits. |
| `.claude/worktrees/distributed-plotting-quail` | `worktree-distributed-plotting-quail` | `267c3bf` | **Aferidor** (Onda 1 antiga) | Árvore limpa (`working tree clean`). Já integrada ao histórico principal via commit `393e1b4`. |
| `.claude/worktrees/peaceful-dazzling-gosling` | `worktree-peaceful-dazzling-gosling` (locked) | `c17071e` | **Aferidor** (Onda 0.1) | 14 arquivos modificados em `scripts/` e `dados_tratados/` corrigindo `-` para `NaN`/`sem_registro` + `docs/handoffs/aferidor-onda0-1.md`. **Não integrada** ao checkout principal. |

---

## 3. Diagnóstico Forense da Divergência e Plano de Reconciliação

1. **Divergência de SHA-base:**
   A worktree `peaceful-dazzling-gosling` foi ramificada a partir do commit antigo `c17071e`, enquanto o checkout principal avançou até `36be214` (incorporando vintages do Aferidor, pranchas da Retícula e baseline da Vistoria).
2. **Divergência na Definição da Coorte:**
   O handoff do Aferidor na worktree usou `valor_real_periodo > R$ 2M` (soma do período), gerando 474 municípios. A coorte autorizada e definida pelo método é estritamente:
   > **“Municípios com valor aprovado real acima de R$ 2 milhões em 2015.”**
   O controle esperado para a coorte correta é:
   - 393 municípios na coorte;
   - 386 observados em 2025;
   - 7 sem registro em 2025 (Assu, Parnamirim, Barra do Piraí, Paracambi, São Roque, São Sebastião e Joaçaba);
   - 161 quedas reais entre os 386 comparáveis (41,71%).
3. **Regra de Integração:**
   Nenhum handoff em worktree isolada é aceito como concluído. As correções do Aferidor devem ser migradas e reconciliadas no checkout de integração `C:\Users\Antonio\Desktop\dialisasus`, o pipeline completo deve rodar no checkout principal, e Contraprova deve auditar os números a partir do dado bruto antes de qualquer avanço de território no dossiê.

---

## 4. Regras Obrigatórias para Todos os Despachos

Todo despacho emitido pelo Maestro declara:
- **SHA-base:** `36be214`
- **Diretório:** `C:\Users\Antonio\Desktop\dialisasus` (ou worktree formal se isolamento estrito for exigido)
- **Arquivos permitidos:** lista explícita dos arquivos que a tarefa tem autorização para criar/modificar.
- **Arquivos proibidos:** tudo fora da lista permitida (especialmente intocabilidade de `tokens.json` bloco `brand`, proibição de hex literal, proibição de commit/push/deploy).
- **Dependências:** tarefas predecessoras exigidas.
- **Critério de aceite:** condições objetivas verificáveis.
- **Prova exigida:** comandos executados, medições reais, asserções passando.
- **Concorrência:** proibido despachar tarefas concorrentes que alterem os mesmos arquivos.

---

## 5. VAULT

VAULT: `00-SISTEMA/MEMORY_PROTOCOL.md` → Git é a verdade do código; inventário de worktrees e rastreabilidade de SHA estabelecem a verdade operacional.
VAULT: `04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` → Pré-requisitos de consulta e disciplina de handoff aplicados no preflight.
VAULT: `01-PROJETOS/DialisaSUS/AUDITORIA-SQUAD-REMODELACAO-2026-09-16.md` → Diagnóstico da auditoria acolhido integralmente: worktree isolada não é entrega, coorte corrigida para 2015.
VAULT: `01-PROJETOS/DialisaSUS/ROADMAP.md` → Procedimento de preflight do Maestro cumprido com verificação de papéis e proibições de recrutamento duplicado.
VAULT: `01-PROJETOS/DialisaSUS/APRENDIDOS.md` → Regra permanente aplicada: registrar SHA-base, branch e diretório antes de qualquer despacho; validação obrigatoriamente no checkout de integração.
