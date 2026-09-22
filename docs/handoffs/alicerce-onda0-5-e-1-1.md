# Handoff: Alicerce · Ondas 0.5 e 1.1

- **Papel:** Alicerce — Arquitetura, Agente e Segurança
- **Data:** 2026-09-16
- **Branch:** `remodelacao-v2`
- **Status:** concluído
- **Commit/push/deploy:** não realizados

## Resultado

As duas entregas estão prontas:

1. `docs/ADR-001-STACK.md` formaliza Astro estático mantido e React revogado. O esqueleto gera as sete rotas-base como HTML estático, sem runtime JavaScript.
2. `docs/CONTRATO-DOSSIE.md` e `dossie/schema.json` definem o dossiê completo em JSON Schema Draft 2020-12. Todo valor estatístico exige unidade, estado e origem; toda taxa exige procedência do denominador. A matriz G1–G7 demonstra a cobertura do inventário.

O Schema foi integrado aos documentos já emitidos pela Onda 1.5. `dossie/glossario.json` e `dossie/ressalvas.json` receberam apenas o discriminador e os metadados do contrato; o conteúdo editorial do Verbete foi preservado.

## Entregas

### Onda 0.5

- `docs/ADR-001-STACK.md`
- `astro.config.mjs`
- `tsconfig.json`
- `src/layouts/BaseLayout.astro`
- sete entradas em `src/pages/`
- `public/favicon.svg`
- scripts Astro em `package.json` e lockfile atualizado
- `netlify.toml` apontando o build para `npm run build`
- Astro 7.3.2 registrado em `SOURCES.md`, com licença MIT

### Onda 1.1

- `docs/CONTRATO-DOSSIE.md`
- `dossie/schema.json`
- `scripts/validar_schema_dossie.py`
- comando `npm run check:dossie`
- integração de `dossie/glossario.json` e `dossie/ressalvas.json` ao Schema

## Evidências

### DECLARADO

- `docs/PLANO-V3-CONCEITO-C.md` §2 determina Astro mantido, React revogado e três ilhas independentes em TypeScript puro.
- O mesmo plano, §3.5, fixa as formas canônicas de ponto, taxa e achado e a divisão do dossiê por rota.
- O inventário §6 exige G1–G6 e reserva G7 a gate humano; o contrato cobre os sete IDs sem decidir a publicação de G7.
- Território fica limitado a 2015–2025; mai e jun/2026 permanecem provisórios e nunca são corrigidos automaticamente.

### OBSERVADO

- `package.json` contém `astro: 7.3.2` com versão exata e não contém React/ReactDOM.
- `astro.config.mjs` usa saída `static` e formato `directory`.
- As páginas Astro não importam módulos de cliente nem diretivas de hidratação.
- `dossie/schema.json` discrimina oito tipos de documento e fecha objetos com `additionalProperties: false`.
- `PontoSerie` exige `periodo`, `valor`, `estado`, `unidade` e `origem`; `PontoTaxa` acrescenta `denominador` e `quebra_denominador`.
- `Origem` exige `arquivos_csv`, `colunas`, `script` e `transformacao`.
- O validador usa `Draft202012Validator.check_schema`, `FormatChecker` e valida todos os JSONs materializados em `dossie/`.
- As telas foram abertas por HTTP e inspecionadas visualmente em 390 e 1440 px. Ambas aparecem deliberadamente vazias, brancas e sem artefatos, como requerido para o esqueleto desta onda.

### MEDIDO

Comandos executados em 16/09/2026:

| Verificação | Resultado |
|---|---|
| `npm run check:dossie` | exit 0; Schema Draft 2020-12 válido; 2 documentos reais validados |
| parse via `python -m json.tool` | 3/3 JSONs válidos: Schema, glossário e ressalvas |
| `npm run build` | exit 0; 7 páginas geradas |
| arquivos JS em `dist/` | 0 |
| HTMLs contendo `<script>` | 0 |
| `npm ls react react-dom --omit=dev` | grafo vazio |
| `npm test` | 7 testes, 7 aprovados, 0 falhas |
| QA HTTP em 390 px | 7/7 rotas HTTP 200; `scrollWidth === innerWidth`; zero scripts |
| QA HTTP em 1440 px | 7/7 rotas HTTP 200; `scrollWidth === innerWidth`; zero scripts |
| console do navegador | 0 erros, 0 avisos |
| `git diff --check` | sem erro de whitespace; apenas avisos de conversão LF/CRLF do Git no Windows |

Rotas medidas:

- `/`
- `/evidencias/contagem/`
- `/evidencias/valor/`
- `/evidencias/territorio/`
- `/evidencias/modelo/`
- `/sobre-a-base/`
- `/assistente/`

## Cobertura do aceite

- [x] ADR formalizada, com Astro mantido e React revogado.
- [x] Build Astro gera as sete rotas estáticas vazias.
- [x] `dist/` não contém runtime JavaScript nem tags `<script>`.
- [x] Contrato textual completo entregue.
- [x] JSON Schema validável por máquina entregue e verificado.
- [x] Valores estatísticos carregam tipo pelo Schema, unidade, origem e estado.
- [x] Taxas carregam denominador, estado, fonte e origem do denominador.
- [x] Matriz de cobertura prova que G1–G7 não pedem série ausente.
- [x] Handoff contém evidências DECLARADO, OBSERVADO e MEDIDO.

## Limites preservados

- O dossiê registra procedimentos aprovados, não pacientes.
- Não houve alteração de números, recorte ou método.
- DPAC/DPA e CICLODIALISE continuam questões abertas, registradas no contrato.
- G7 permanece sujeito ao gate G-F.
- Nenhum commit, push ou deploy foi executado.
- Não foi escrita memória nova no Vault: esta entrega implementa decisões já registradas e não revelou bug ou padrão permanente novo que justifique duplicação.

## VAULT

VAULT: `00-SISTEMA/MEMORY_PROTOCOL.md` → decisões existentes foram implementadas; nenhum log de sessão foi gravado como memória permanente.
VAULT: `04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` → Vault consultado antes de decidir e aplicação registrada nota a nota.
VAULT: `01-PROJETOS/DialisaSUS/DECISOES.md` → Astro mantido, React revogado, cinco estados preservados e escopo acadêmico não alterado.
VAULT: `01-PROJETOS/DialisaSUS/ROADMAP.md` → entregas limitadas às Ondas 0.5 e 1.1; gates humanos e proibição de deploy preservados.
VAULT: `02-CONHECIMENTO/PRINCIPIOS/ESCOLHA-DE-TECNOLOGIA-PELA-EXPERIENCIA.md` → escolhida a camada mais barata que entrega as três interações independentes.
VAULT: `02-CONHECIMENTO/PADROES/PADRAO-ARQUITETURA-FRONTEND-SEM-FRAMEWORK.md` → Astro usado como gerador; conteúdo essencial permanece no HTML e ilhas futuras ficam em TypeScript puro.
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-DECISAO-REVERTIDA-SO-NA-CONVERSA.md` → revogação do React formalizada em ADR durável, preservando a decisão anterior como histórico.
