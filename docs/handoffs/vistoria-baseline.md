# Handoff: Vistoria · Linha de Base v1 e Script Único de Auditoria de Rotas

- **Papel:** Vistoria (QA Técnico & Homologação Forense)
- **Data:** 2026-09-15
- **Branch:** `remodelacao-v2`
- **Status:** Concluído com sucesso (todos os critérios de aceite atendidos)

---

## BASE OBRIGATÓRIA NO OBSIDIAN (VAULT)

VAULT: C:\Users\Antonio\AI-Vault\00-SISTEMA\MEMORY_PROTOCOL.md → Aplicação da distinção estrita entre memória permanente e evidências operacionais; dados brutos salvos em docs/evidencias/ e síntese técnica estruturada em QA-BASELINE-V1.md.
VAULT: C:\Users\Antonio\AI-Vault\04-DECISOES-GLOBAIS\DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md → Consulta prévia e obrigatória a todas as notas do AI-Vault indicadas na tarefa antes de planejar e executar qualquer ação.
VAULT: C:\Users\Antonio\AI-Vault\01-PROJETOS\DialisaSUS\CONTEXTO.md → Verificação do diagnóstico forense contra a base em produção da v1 (confirmação do peso de GeoJSON, PNG não otimizado e scripts legados).
VAULT: C:\Users\Antonio\AI-Vault\01-PROJETOS\DialisaSUS\DECISOES.md → Aplicação da regra soberana de migração para Astro estático com ilhas React para eliminar o bloqueio por JS e garantir resiliência sem script.
VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\CHECKLISTS\CHECKLIST-QA-VISUAL-FRONTEND.md → Execução da bateria canônica de viewports (320px, 375px, 768px, 1024px, 1440px) e aferição de overflow horizontal (scrollWidth === innerWidth).
VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\CHECKLISTS\CHECKLIST-SITE-ALTO-PADRAO.md → Validação de hierarquia semântica HTML5, presença de tag canonical, marcação estruturada JSON-LD e Core Web Vitals no verde.
VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\AGENTES\QA-COMO-PAPEL-DO-PROCESSO.md → Integração da automação de QA como ferramenta executável do processo (tools/auditar-rotas.mjs) em vez de conferência tardia pós-build.
VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\AGENTES\AGENT-CONTRACT-E-HANDOFF.md → Rigor probatório (§3.1): eliminação de qualquer veredito DECLARADO, exigindo medições reais MEDIDO e capturas de tela OBSERVADO.

---

## 1. Artefatos Entregues

1. **Documento de Linha de Base v1 (`docs/QA-BASELINE-V1.md`):**
   - Relatório forense completo com métricas medidas de peso de rede, Web Vitals, acessibilidade por aba, nós sem contraste WCAG AA, testes de overflow nos viewports canônicos e teste de resiliência sem JavaScript.
2. **Script Único de Auditoria Contínua (`tools/auditar-rotas.mjs`):**
   - Ferramenta em Node.js / Playwright / Axe-core cobrindo os 5 requisitos mandatórios:
     1. Bateria axe Core WCAG 2.1 AA;
     2. Verificação de overflow horizontal responsivo;
     3. Validação de hierarquia de títulos (h1 único);
     4. Integridade de meta canonical e JSON-LD;
     5. Varredura estática de arquivos CSS em busca de cores hexadecimais literais (forçando obediência aos tokens).
3. **Evidências Mensuradas e Screenshots (`docs/evidencias/baseline-v1/`):**
   - 14 screenshots de alta fidelidade cobrindo todas as 7 abas, splash screen, viewports (320px, 375px, 768px, 1440px), o overflow na Metodologia e a falha total sem JS.
   - `audit-raw.json`: Dataset estruturado em JSON com todo o tráfego de rede, tempos e violações capturadas.

---

## 2. Síntese dos Resultados Medidos na v1 (Produção)

| Item Auditado | Valor Medido | Limite / Padrão Esperado | Status |
| :--- | :---: | :---: | :---: |
| **Peso Total Transferido** | **2,735 MB** (2.800,4 KB) | < 500 KB (Meta v2) | **REPROVADO** (1 imagem PNG = 63,9% do peso) |
| **LCP (Largest Contentful Paint)**| **4.576 ms** | < 2.500 ms (Meta Google) | **REPROVADO (CRÍTICO)** |
| **CLS (Cumulative Layout Shift)**| **0,0678** | < 0,1000 | **APROVADO** |
| **Nós com Falha de Contraste** | **44 nós** | 0 nós | **REPROVADO** (Botão primário azul tem ratio 4,39:1) |
| **Violações Axe Core na Triagem**| 1 (`aria-prohibited-attr`)| 0 violações | **REPROVADO** (`aria-label` em div sem role) |
| **Overflow em 320px (Metodologia)**| **scrollWidth: 379px** | scrollWidth === 320px | **REPROVADO (+59px de estouro)** |
| **Resiliência sem JavaScript** | **0% funcional** (tela congelada)| Conteúdo legível / fallback | **REPROVADO** (Splash bloqueia tela sem noscript) |
| **Hierarquia de Títulos** | 2 `<h1>` no DOM | Exatamente 1 `<h1>` | **REPROVADO** |
| **Tag Canonical e JSON-LD** | Inexistentes | Obrigatórios para SEO | **REPROVADO** |
| **Cores Literais Hex nos CSS** | **324 ocorrências** | 0 ocorrências fora de tokens | **REPROVADO** |

---

## 3. Próximos Passos e Recomendações para o Squad

- **Para Retícula (Design & Tokens):**
  - Ajustar o token de azul primário de `#3f72e8` para um valor com contraste >= 4.5:1 sobre branco (ex: `#3365d6` ou `#2563eb`).
  - Corrigir a cor do texto dos botões secundários (`#768298` para `#525d70` ou mais escuro).
  - Garantir que todos os 324 hexadecimais mapeados no CSS sejam convertidos em tokens CSS formais.
- **Para Cadência & Alicerce (Build & Arquitetura Astro):**
  - A v2 em Astro resolve nativamente a resiliência sem JavaScript, servindo HTML estático na primeira pintura e eliminando a splash screen bloqueante de 1.800 ms.
  - Substituir o PNG `renal-astra-lab.png` de 1,8 MB por WebP/AVIF otimizado ou renderização vetorial leve.
  - Executar rotineiramente `node tools/auditar-rotas.mjs` durante o desenvolvimento para validar as rotas da v2 contra regressões visuais e de acessibilidade.
