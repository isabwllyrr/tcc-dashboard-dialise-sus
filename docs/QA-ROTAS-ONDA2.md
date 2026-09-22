# QA de rotas — DialisaSUS v2

**Data:** 18/09/2026 · **Alvo:** build local em `dist/`, servido por HTTP · **Executado por:** Vistoria
**Evidência bruta:** `docs/evidencias/onda2/auditoria_onda2_resultados.json` · **Reprodução:** `node tests/run_full_audit.mjs`

## Resultado

**14 rotas auditadas: 7 canônicas e 7 amostras de UF.** Nenhuma falha.

| Verificação | Resultado |
|---|---|
| `h1` único | **14 / 14** |
| Aviso de unidade antes da primeira figura | **14 / 14** |
| Overflow horizontal em 320, 375, 768, 1024 e 1440 px | **14 / 14 com delta 0 px** |
| Violações estruturais axe-core (WCAG 2.1 AA) | **0 em 14 / 14** |
| Nós com problema de contraste | **0** |

O auditor de rotas (`node tools/auditar-rotas.mjs`) fecha com **FAIL 0, PASS 10** e código de saída 0.

## Rotas cobertas

Canônicas: `/` · `/evidencias/valor/` · `/evidencias/contagem/` · `/evidencias/territorio/` · `/evidencias/modelo/` · `/sobre-a-base/` · `/assistente/`

Amostra de UF: SP, RJ, MG, BA, AM, RS, PE.

## JavaScript no cliente

Dos 35 arquivos HTML do build, **5 não carregam nenhum script de cliente** e 30 carregam.

| Onde | O que é | Degrada sem JS? |
|---|---|---|
| `/` | Módulo do rim 3D, importação dinâmica sob demanda | Sim — duas vistas WebP no HTML inicial |
| `/assistente/` | Envio do formulário por `fetch` | Sim — `form action="/api/agent" method="POST"` |
| 27 páginas de UF | Seletor de ano que filtra a tabela municipal | Sim — tabela renderizada no servidor |

**A declaração anterior de "0 KB de JavaScript no cliente" estava errada.** Há JS em 28 rotas. Os três casos são enriquecimento progressivo legítimo e todos foram verificados degradando corretamente — mas a afirmação no handoff da Onda 2.2 não correspondia ao build.

O que **de fato** vale: **nenhuma rota além de `/` carrega runtime ou malha 3D.** Confirmado por rede: antes do clique em "Explorar em 3D", zero requisições de Three.js, loader ou GLB; nas outras 33 rotas, zero em qualquer momento.

## Dois defeitos encontrados e corrigidos nesta rodada

**1. A home não trazia o aviso de unidade na forma canônica.** Seis das sete rotas traziam "Esta base conta procedimentos aprovados, não pessoas"; a home dizia a mesma coisa com outras palavras e não era reconhecida pela verificação. Corrigido no capítulo 02 — a frase agora abre a ressalva.

**2. O sumário do auditor reportava zero.** `tests/run_full_audit.mjs` inicializava o bloco `summary` e nunca o preenchia: depois de auditar 14 rotas, o JSON dizia `totalRoutes: 0`. Um relatório que afirma zero depois de medir catorze é pior que nenhum relatório, porque quem lê conclui o oposto do que aconteceu. A agregação foi escrita e conferida contra a estrutura real dos campos.

## Tema claro e escuro

O build passou a ter tema escuro, que **não existia** — os três CSS somavam zero ocorrências de `prefers-color-scheme`, e `data-theme="dark"` não tinha efeito.

Os três estados foram verificados no navegador:

| Estado | `--bg` resultante |
|---|---|
| `data-theme="light"` com sistema escuro | `#FFFFFF` |
| `data-theme="dark"` | `#0C0F14` |
| Sem atributo, sistema escuro | `#0C0F14` |

A implementação redefine **apenas tokens**, nos dois blocos guardados; nenhum componente tem cor declarada dentro de bloco de tema. A rampa sequencial do mapa foi invertida para manter luminosidade monotônica sobre fundo escuro.

## Leitor de tela

**O NVDA não foi executado: não está instalado nesta máquina.** Verificado em `Program Files`, `Program Files (x86)`, no registro de desinstalação e na lista de processos. Nada encontrado.

No lugar, auditei **a camada que o leitor de tela consome**: a árvore de acessibilidade e a operação por teclado. Isso cobre boa parte do que o NVDA revelaria, e **não substitui** ouvir a leitura real.

### Dois defeitos encontrados — e corrigidos

**1. Cabeçalhos de coluna sem `scope`.** As tabelas gêmeas tinham `scope="row"` nas linhas, mas o `<thead>` trazia `<th>` sem `scope="col"`. Em modo de tabela, é o `scope` que garante o anúncio do cabeçalho ao mover entre colunas. Corrigido em todas as tabelas: **zero `<th>` de cabeçalho sem `scope`**.

**2. Sem hierarquia de cabeçalhos.** Quatro das seis rotas tinham **apenas o `h1`** — os marcadores de seção e os títulos de figura eram parágrafos. Quem navega por cabeçalho (tecla H no NVDA) não tinha por onde andar: um documento inteiro com um único ponto de parada.

Agora cada rota tem hierarquia real:

| Rota | `h1` | `h2` |
|---|---|---|
| `/` | 1 | 6 (os seis capítulos da narrativa) |
| `/evidencias/valor/` | 1 | 3 |
| `/evidencias/territorio/` | 1 | 3 |
| `/evidencias/contagem/` | 1 | 2 |
| `/evidencias/modelo/` | 1 | 4 |
| `/sobre-a-base/` | 1 | 6 |
| `/assistente/` | 1 | 3 |

### Um falso positivo que quase virou defeito

A primeira varredura acusou **27 links sem nome acessível** no mapa coroplético. Era erro da minha verificação: `innerText` retorna vazio em elementos SVG. Conferido de novo pelo mecanismo correto, os 27 links têm `<title>` com sigla e valor — *"AC: 9.735 por 100 mil"*. **Zero sem nome.** O mapa está bem feito para leitor de tela.

### O que passou

Landmarks `header`, `nav`, `main` e `footer` presentes em todas as rotas. Os dois `select` do território têm `<label for>` correto — "Ano" e "UF". Todos os controles do rim têm nome e `aria-pressed`. As figuras têm `role="img"` com rótulo.

## O que continua sem verificação

- **NVDA em si.** Só uma execução real prova como a leitura soa — ordem, pausas, verbosidade. A árvore estar correta é condição necessária, não suficiente.
- **Aparelho físico.** Todas as medições em desktop, Intel i7-1255U com Iris Xe. Celular de entrada segue sem medição.
- **Core Web Vitals de campo.** Sem dados reais de usuário.

## Gates humanos ainda abertos

Copy final, nome completo da autora, orientação e instituição, e as perguntas de método com a autora e o orientador. Nenhum é resolvível por QA.
