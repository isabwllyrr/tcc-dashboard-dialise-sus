# Handoff — Alicerce · fechamento local do sistema

Data: 18/09/2026  
Checkout: `C:\Users\Antonio\Desktop\dialisasus`  
Branch: `remodelacao-v2`

## Estado da entrega

O sistema está pronto no checkout principal para revisão acadêmica e autorização de publicação. Não houve commit, push ou deploy.

## DECLARADO

- O produto é tecnológico e acadêmico, no contexto do TCC da autora; DATASUS e IBGE são fontes, não chancela.
- A unidade de análise é procedimento aprovado. Uma pessoa pode realizar vários procedimentos.
- O território é por local de atendimento e cobre somente anos completos; 2026 permanece parcial na série nacional.
- DPAC/DPA fora do recorte e CICLODIALISE dentro dele continuam reportados como questões de escopo, sem correção silenciosa.
- A decisão metodológica final sobre modelos pertence à autora e ao orientador.

## OBSERVADO

- Todas as rotas publicam números lidos diretamente do dossiê canônico durante o build; a rota completa está em `docs/RASTREABILIDADE-NUMEROS.md`.
- G1–G6 têm SVG no HTML inicial, `figcaption` e tabela gêmea. G7 permanece como texto e tabela de distribuição/exclusões, sem transformar ausência em zero.
- O mapa usa geometria derivada do GeoJSON aprovado, mas as classes e os rótulos vêm de `dossie/territorio/indice.json`.
- As 27 fichas de UF usam um único template Astro e seus respectivos `uf-<UF>.json`; o antigo bloco de HTML copiado por UF deixou de ser fonte de verdade.
- As únicas ilhas são TypeScript/JavaScript puro: cena do rim sob demanda, seleção territorial/municipal e formulário do assistente.
- O assistente carrega o dossiê no servidor, valida filtros por enum, recusa clínica deterministicamente, devolve a rota dona e oferece POST HTML sem JavaScript.
- Fontes Archivo, Newsreader itálico e IBM Plex Mono são empacotadas localmente; o carregamento não depende do Google Fonts.
- `netlify.toml` inclui o dossiê nas funções e declara CSP, `nosniff`, anti-frame, referrer policy e permissions policy.

## MEDIDO

- `npm run build`: 34 páginas estáticas.
- `npm test`: 23/23 testes passaram.
- `npm run check:dossie`: schema Draft 2020-12 válido; 34/34 documentos válidos.
- `python scripts/validar_dados.py`: passou; 138 meses, 498 municípios, 297 linhas UF-ano, 397 trajetórias comparáveis e 101 exclusões.
- `node tests/run_auditor_cli.mjs`: 72 PASS, 0 FAIL; axe sem violação e reflow correto em 320, 375, 768, 1024 e 1440 px.
- `node tests/qa_final.mjs`: 34 páginas, 68 viewports, 0 overflow, 0 erro de `h1`, 0 erro de console e 4/4 interações.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- Inspeção visual das capturas de 390 e 1440 px: aprovada após corrigir a grade da sequência da home no mobile.

## Arquivos centrais

- `src/lib/dossie.ts`
- `src/components/LineChart.astro`
- `src/pages/`
- `netlify/functions/agent.mjs`
- `netlify.toml`
- `tests/netlify_agent.test.mjs`
- `tests/qa_final.mjs`
- `docs/evidencias/final/auditoria-final.json`
- `docs/QA-ROUTAS-ONDA2.md`
- `docs/RASTREABILIDADE-NUMEROS.md`

## Limite operacional preservado

O build local está pronto. Publicação permanece pendente de autorização explícita; nenhum deploy foi tentado. O caminho Gemini foi validado por teste com transporte simulado e fallback local, sem expor chave ou detalhes do provedor; uma chamada real depende da variável `GEMINI_API_KEY` no ambiente autorizado.

VAULT: `00-SISTEMA/MEMORY_PROTOCOL.md` → fatos separados em DECLARADO, OBSERVADO e MEDIDO; aprendizado permanente devolvido ao Vault.
VAULT: `04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` → Vault consultado antes das decisões e linhas VAULT incluídas na entrega.
VAULT: `04-DECISOES-GLOBAIS/DECISAO-SOBERANIA-DOS-DESIGN-TOKENS.md` → tokens fornecidos preservados; zero hexadecimal literal em componentes.
VAULT: `02-CONHECIMENTO/PADROES/PADRAO-DATAVIZ-ACESSIVEL.md` → SVG sem dependência de JS, legenda numérica, tabela gêmea, codificação secundária e inspeção a 390/1440 px.
VAULT: `02-CONHECIMENTO/PADROES/PADRAO-ARQUITETURA-FRONTEND-SEM-FRAMEWORK.md` → Astro como gerador estático e ilhas pequenas em TypeScript/JavaScript puro.
VAULT: `01-PROJETOS/DialisaSUS/DECISOES.md` → contexto do assistente montado no servidor; método acadêmico não alterado em silêncio.
VAULT: `01-PROJETOS/DialisaSUS/CONTEXTO.md` → procedimentos nunca tratados como pessoas; provisórios, atendimento e escopo preservados.
VAULT: `01-PROJETOS/DialisaSUS/ROADMAP.md` → gates das ondas executados na ordem e deploy mantido como autorização separada.
VAULT: `01-PROJETOS/DialisaSUS/APRENDIDOS.md` → build verde não substituiu HTTP/viewport; falhas do auditor mantêm exit code diferente de zero.
