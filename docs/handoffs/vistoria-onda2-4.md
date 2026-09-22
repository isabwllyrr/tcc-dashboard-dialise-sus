# Vistoria — Onda 2.4: auditoria contínua de rotas e acessibilidade

**Papel:** Vistoria. **Data:** 18/09/2026. **Branch:** `main`. **Sem commit, push, preview ou deploy até autorização.**

> Onda iniciada em 17/09 e interrompida por esgotamento de cota **exatamente na redação deste documento** — a bateria já havia rodado e a evidência estava em disco. Concluída em 18/09, com a bateria reexecutada contra o build atual, porque medição de ontem não descreve o build de hoje.

**Relatório:** `docs/QA-ROTAS-ONDA2.md` · **Evidência:** `docs/evidencias/onda2/auditoria_onda2_resultados.json` · **Reprodução:** `node tests/run_full_audit.mjs`

## Resultado

14 rotas auditadas — 7 canônicas e 7 amostras de UF. **Nenhuma falha.**

| | |
|---|---|
| `h1` único | 14 / 14 |
| Aviso de unidade | 14 / 14 |
| Overflow em 320, 375, 768, 1024, 1440 px | 14 / 14, delta 0 px |
| Violações estruturais axe (WCAG 2.1 AA) | 0 |
| Contraste | 0 nós com problema |
| `tools/auditar-rotas.mjs` | FAIL 0, PASS 10, saída 0 |

## O que corrigi nesta onda

**1. O alvo padrão do auditor apontava para a v1 em produção.** `tools/auditar-rotas.mjs:39` trazia `DEFAULT_TARGET = 'https://dialisasus.netlify.app/web_dashboard/'`. Rodando sem argumento, a ferramenta auditava o dashboard antigo publicado — e as três falhas que reportava eram dele, não do produto novo. Alvo padrão passa a ser o build local.

**2. O sumário do relatório reportava zero.** `tests/run_full_audit.mjs` inicializava `summary` e nunca o preenchia: depois de auditar 14 rotas, o JSON dizia `totalRoutes: 0`. Agregação escrita e conferida contra a estrutura real dos campos — `overflow` é objeto por viewport, `axe` tem `structuralViolations` e `contrastNodes`.

**3. A home não trazia o aviso de unidade na forma canônica.** As outras seis rotas traziam "Esta base conta procedimentos aprovados, não pessoas"; a home dizia o mesmo com outras palavras e não era reconhecida. A frase agora abre a ressalva do capítulo 02.

**4. O tema escuro não existia no build.** Os três CSS somavam zero ocorrências de `prefers-color-scheme` e `data-theme="dark"` não tinha efeito — a amostra aprovada tinha a paleta completa e a migração para Astro a perdeu. Implementado redefinindo **só tokens**, nos dois blocos guardados, com a rampa sequencial invertida para luminosidade monotônica sobre fundo escuro. Os três estados verificados no navegador.

## Uma afirmação anterior que não se sustenta

O handoff da Onda 2.2 declara **"0 KB de JavaScript no cliente"**. Medido: **28 das 34 rotas carregam script**.

- `/` — módulo do rim, importação dinâmica sob demanda
- `/assistente/` — envio por `fetch`
- 27 páginas de UF — seletor de ano filtrando a tabela

Os três são enriquecimento progressivo legítimo e **todos degradam corretamente** — verifiquei: vistas WebP no HTML inicial, `form method="POST"` real, tabela municipal renderizada no servidor. O problema não é o JavaScript; é o handoff afirmar o contrário do build.

O que de fato se sustenta, e é o requisito real: **nenhuma rota além de `/` carrega runtime ou malha 3D**, confirmado por rede.

## Leitor de tela: tentado, bloqueado, substituído

**O NVDA não está instalado nesta máquina** — conferido em `Program Files`, `Program Files (x86)`, registro de desinstalação e lista de processos. Não foi executado, e nenhuma linha deste handoff afirma o contrário.

Auditei no lugar a camada que o leitor consome — árvore de acessibilidade e teclado — e ela revelou **dois defeitos que o axe não pega**, ambos corrigidos:

1. **`<th>` de cabeçalho sem `scope="col"`.** As linhas tinham `scope="row"`, as colunas não tinham nada. Corrigido em todas as tabelas gêmeas.
2. **Quatro de seis rotas com apenas o `h1`.** Marcadores de seção e títulos de figura eram parágrafos; a navegação por cabeçalho, que é como um usuário de NVDA percorre um documento, não tinha ponto de parada. Todas as rotas passaram a ter `h2` reais — a home ganhou os seis capítulos da narrativa.

Também levantei **um falso positivo e o derrubei antes de reportar**: a varredura acusou 27 links sem nome no mapa, mas `innerText` retorna vazio em SVG. Pelo mecanismo correto, os 27 têm `<title>` com sigla e taxa. Zero sem nome.

## Não medido

- **NVDA em si** — a árvore correta é condição necessária, não suficiente. Só a execução real mostra ordem de leitura, pausas e verbosidade.
- **Aparelho físico de entrada** — tudo medido em desktop i7-1255U / Iris Xe.
- **Core Web Vitals de campo** — sem dados de usuário real.

---

VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-TESTES-VERDES-SEM-QA-VISUAL.md` → bateria reexecutada contra o build atual; os três estados de tema verificados na tela, não deduzidos do CSS.
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-QA-VAGO.md` → sumário que reportava zero depois de auditar catorze rotas foi corrigido; relatório que contradiz a própria medição engana quem lê.
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-PROVAS-FALSAS-OU-INVENTADAS.md` → a declaração de "0 KB de JavaScript" foi confrontada com o build e corrigida no registro; o que não foi medido está nomeado.
VAULT: `02-CONHECIMENTO/PADROES/PADRAO-DATAVIZ-ACESSIVEL.md` → equivalência entre figura e tabela gêmea conferida; contraste sem nó reprovado em claro e escuro.
VAULT: `04-DECISOES-GLOBAIS/DECISAO-SOBERANIA-DOS-DESIGN-TOKENS.md` → o tema escuro redefine apenas tokens; nenhum componente ganhou cor dentro de bloco de tema.
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-CONTEUDO-ESSENCIAL-SO-EM-JS.md` → as três ilhas verificadas degradando sem JavaScript.
