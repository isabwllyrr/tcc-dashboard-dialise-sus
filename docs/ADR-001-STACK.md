# ADR-001 — Astro estático com ilhas em TypeScript puro

- **Status:** aceito
- **Data:** 2026-09-16
- **Decisão anterior:** “Astro estático + ilhas React no Netlify”, registrada em 2026-09-15
- **Escopo:** DialisaSUS v2, conceito C

## Contexto

O conceito C é um caderno de evidências composto por sete documentos com endereço próprio. Cada documento precisa funcionar em leitura isolada, entregar o conteúdo essencial no HTML inicial e continuar legível sem JavaScript. O território acrescentará 27 páginas de UF geradas a partir do dossiê.

Há três pontos interativos previstos, todos independentes:

1. seletor de UF/ano em `/evidencias/territorio/`;
2. cena do rim em `/evidencias/contagem/`;
3. formulário do assistente em `/assistente/`.

Eles não compartilham estado, não formam uma árvore reativa comum, não virtualizam listas e não exigem um runtime de componentes no cliente.

## Decisão

**Astro é mantido como gerador estático. React é revogado.** As três ilhas serão módulos independentes em TypeScript puro, carregados somente nas rotas que os usam.

O build usa `output: "static"` e `format: "directory"`. As sete rotas-base são geradas como `index.html`:

- `/`
- `/evidencias/contagem/`
- `/evidencias/valor/`
- `/evidencias/territorio/`
- `/evidencias/modelo/`
- `/sobre-a-base/`
- `/assistente/`

O Astro não envia runtime por padrão. Uma rota só poderá emitir JavaScript quando importar explicitamente o módulo TypeScript da sua ilha. Conteúdo, SVG, tabelas, ressalvas e fallback permanecem no HTML inicial.

## Justificativa

Astro paga o próprio custo de manutenção porque resolve geração de rotas, layouts compartilhados e páginas derivadas de dados sem transformar navegação ou conteúdo em estado de cliente. Isso torna verificável a promessa de leitura sem JavaScript.

React + ReactDOM adicionaria runtime para três interações isoladas sem estado compartilhado. A conveniência local não compensa o peso de rede, parse e execução, nem a superfície extra de manutenção. TypeScript puro é a camada mais barata que entrega essas interações.

Vanilla sem gerador também foi recusado: sete documentos, 27 fichas de UF, tabelas gêmeas e layouts compartilhados exigiriam reimplementar geração e roteamento que Astro já fornece no build.

## Consequências

- A saída base é HTML estático, sem JavaScript.
- O seletor de UF/ano preservará URLs reproduzíveis; sem JS, links e páginas de UF continuam funcionando.
- A cena do rim será carregada sob demanda apenas em `/evidencias/contagem/`, com fallback HTML anterior ao script.
- O formulário do assistente terá degradação por `POST`; o conteúdo da rota não dependerá de script.
- A cadeia visual será `variables.css` → `theme.css` → componentes Astro. Componentes não usarão hex literal nem valores visuais soltos.
- Toda nova dependência será registrada em `SOURCES.md`, com versão, licença e local de uso, na mesma alteração que a adicionar.
- Netlify continua como hospedagem da saída estática e da Function do assistente. Esta ADR não autoriza deploy.

## Critérios verificáveis

1. `npm run build` termina com sucesso.
2. `dist/` contém exatamente as sete rotas-base esperadas nesta onda.
3. `dist/` não contém arquivos `.js`, `.mjs` ou `.cjs`.
4. Nenhum `<script>` é emitido nos sete HTMLs.
5. A dependência React não existe em `package.json` nem no grafo de produção.

## Reversão

React só volta mediante nova ADR se surgir interação com estado compartilhado ou complexidade observada que TypeScript puro não entregue de modo sustentável. Preferência do time ou familiaridade não bastam.

## Base da decisão

VAULT: `01-PROJETOS/DialisaSUS/DECISOES.md` → decisão de 16/09 mantém Astro, revoga React e fixa as três ilhas independentes em TypeScript puro.
VAULT: `02-CONHECIMENTO/PRINCIPIOS/ESCOLHA-DE-TECNOLOGIA-PELA-EXPERIENCIA.md` → escolhida a camada mais barata que entrega a experiência e o orçamento de performance.
VAULT: `02-CONHECIMENTO/PADROES/PADRAO-ARQUITETURA-FRONTEND-SEM-FRAMEWORK.md` → conteúdo essencial no HTML e cadeia de tokens aplicada dentro do Astro.
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-DECISAO-REVERTIDA-SO-NA-CONVERSA.md` → revogação do React formalizada em artefato durável, sem apagar o histórico.
