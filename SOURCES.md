# SOURCES — origem e licença de tudo que vem de fora

## 18/09/2026 — rim procedural, autoria do projeto

`public/assets/kidney.glb`, `kidney-position.webp` e `kidney-hilum.webp`: **autoria do projeto DialisaSUS, gerados proceduralmente**, sem malha, fotografia ou textura de terceiros. Gerador: [`scripts/gerar_rim.mjs`](scripts/gerar_rim.mjs), seed 18473. Master: `docs/amostra/assets/source/rim-procedural-master.glb`. Fallbacks renderizados por HTTP com `tools/inspecionar-rim.mjs`. Receita e hashes em [`docs/amostra/assets/RECEITA-RIM-PROCEDURAL.md`](docs/amostra/assets/RECEITA-RIM-PROCEDURAL.md) e `rim-procedural-manifest.json`. O arquivo `RECEITA-RIM-3D.md` é histórico e descreve o ativo HuBMAP rejeitado. Não há licença de terceiro envolvida no ativo. As ferramentas de geração são dependências de desenvolvimento fixadas em `package-lock.json`; não são enviadas ao navegador.

O registro de aquisição aberta e a receita HuBMAP anteriores foram superados pela instrução de construir o órgão do zero. Os registros HuBMAP abaixo são **históricos, exclusivos do ativo rejeitado e da amostra antiga**, e não atribuem origem ao GLB procedural da home.

Registro exigido por `02-CONHECIMENTO/PROCESSOS/UI-LICENSE-CHECK.md` e `PRINCIPIOS/SOURCE-FIRST-UI.md` do AI-Vault: nada de terceiro entra no projeto sem origem, versão e licença anotadas aqui.

Atualizar **junto** com a adição, nunca depois.

---

## Ferramentas de QA (rodam no desenvolvimento, não vão para o produto)

| Arquivo | Origem | Versão | Licença | Uso |
|---|---|---|---|---|
| `tools/validate_palette.js` | Bundle da skill `dataviz` do Claude Code (`bundled-skills/2.1.270/.../dataviz/scripts/`) | bundle 2.1.270, copiado em 15/09/2026 | **Sem cabeçalho de licença no arquivo.** Distribuído junto do Claude Code. | Gate de paleta da etapa 3. Ferramenta interna de verificação — **não** é redistribuído no site nem embarcado no build. |
| `tools/validate_palette.py` | idem | idem | idem | Par em Python do mesmo validador, para quem não tiver Node. |

**Por que a cópia existe:** o caminho do bundle muda a cada versão do Claude Code. Sem a cópia, o gate de QA quebra sozinho na próxima atualização. Regra registrada em `02-CONHECIMENTO/PADROES/PADRAO-DATAVIZ-ACESSIVEL.md` §4.

**Verificado em 15/09/2026:** roda e passa contra a paleta de referência da própria skill (`--mode light`, 8 slots, exit 0).

```bash
node tools/validate_palette.js "#hex,#hex,…" --mode light
node tools/validate_palette.js "#hex,#hex,…" --mode dark --surface "#…"
node tools/validate_palette.js "#hex,…" --ordinal          # rampa ordinal
node tools/validate_palette.js "#hex,…" --pairs all        # dispersão, mapa, múltiplos pequenos
```

---

## Dados públicos

| Fonte | O que traz | Recorte | Licença / condição |
|---|---|---|---|
| **SIA/SUS via TabNet (DATASUS)** | Valor e quantidade aprovados de 24 procedimentos, por local de **atendimento** | `Jan/2015-Abr/2026` + atualização `Mai-Jun/2026` | Dado público do Ministério da Saúde. Citar fonte e data de extração. Recorte transcrito em `docs/RECORTE-SIGTAP.md`. |
| **IBGE — estimativas populacionais (Tabela 6579)** | População residente estimada | 2015–2021, 2024, 2025 | Dado público. Citar tabela e ano. |
| **IBGE — Censo 2022 (Tabela 4709)** | População residente | 2022 | Dado público. |
| **IBGE — IPCA (Tabela 1737)** | Número-índice mensal | 2015-01 a 2026-06 | Dado público. |

2023 não tem estimativa municipal publicada pelo IBGE: é **interpolação geométrica** entre 2022 e 2024, marcada linha a linha na coluna `fonte_populacao`.

---

## Bibliotecas do produto

Regra: antes de adicionar, conferir licença (`UI-LICENSE-CHECK`), preferir reaproveitar componente já validado (`SOURCE-FIRST-UI`) e registrar aqui **na mesma alteração**.

| Biblioteca | Versão | Licença | Onde é usada | Por que esta |
|---|---|---|---|---|
| [Astro](https://github.com/withastro/astro/tree/astro%407.3.2) | 7.3.2 | MIT, no `LICENSE` do pacote instalado | Gerador estático das sete rotas; não é enviado como runtime ao navegador | Produz HTML por rota e zero JavaScript por padrão, preservando conteúdo essencial sem JS. |
| [Three.js](https://github.com/mrdoob/three.js/tree/r180) | r180 / 0.180.0; tag anotada `r180` aponta para o commit `0af9729d0c143a86a1d725d6e2c3ad83301f3f34`; consultado em 16/09/2026 | **MIT**, declarada no [LICENSE da revisão r180](https://github.com/mrdoob/three.js/blob/r180/LICENSE) e no `package.json` 0.180.0. **APTO PARA REUTILIZAÇÃO**. Texto integral preservado em [`public/licenses/three-js-MIT.txt`](public/licenses/three-js-MIT.txt). | Exclusivamente na rota `/` (home), carregado sob demanda somente após clique no botão de inspeção 3D: `three.module.min.js`, `three.core.min.js`, `GLTFLoader.js`, `BufferGeometryUtils.js` | Renderizar o GLB do rim com controle de câmera e descarte explícito de recursos. Os quatro arquivos locais são byte a byte idênticos aos caminhos correspondentes de `unpkg.com/three@0.180.0/`, verificados em 16/09/2026. Não é usado em `/evidencias/contagem/`. |
| [meshoptimizer](https://github.com/zeux/meshoptimizer/tree/v0.22) | 0.22.0; tag leve `v0.22` no commit `4affad044571506a5724c9a6f15424f43e86f731`; [pacote npm/unpkg](https://unpkg.com/meshoptimizer@0.22.0/); consultado em 16/09/2026 | **MIT**, declarada no [`LICENSE.md` da revisão v0.22](https://github.com/zeux/meshoptimizer/blob/v0.22/LICENSE.md) e no `package.json` 0.22.0; copyright © 2016–2024 Arseny Kapoulkine. **APTO PARA REUTILIZAÇÃO**. Texto integral preservado em [`public/licenses/meshoptimizer-MIT.txt`](public/licenses/meshoptimizer-MIT.txt). | Exclusivamente na rota `/` (home), carregado sob demanda junto do 3D como `meshopt_decoder.module.js`, depois do clique de inspeção | Decodificar no navegador a extensão `EXT_meshopt_compression` do GLB otimizado. O arquivo local é byte a byte idêntico ao [arquivo oficial da tag](https://github.com/zeux/meshoptimizer/blob/v0.22/js/meshopt_decoder.module.js) e ao unpkg; 24.848 bytes, SHA-256 `784315b6959c85459eab77f51776158cc381d7e7d77b919ff7c4935f088a7c5c`. |

## Ativos visuais e geográficos

| Arquivo local | Origem exata | Licença e verificação | Uso e obrigação |
|---|---|---|---|
| `docs/amostra/assets/source/VH_F_Kidney_L.glb` | [HuBMAP CCF 3D Reference Object Library — VH_F_Kidney_L.glb, v1.2](https://ccf-ontology.hubmapconsortium.org/objects/v1.2/VH_F_Kidney_L.glb), consultado e baixado em 16/09/2026 | **CC BY 4.0**, declarada publicamente na [FAQ oficial do HuBMAP](https://docs.hubmapconsortium.org/faq.html#what-are-the-licensing-requirements-to-use-hubmap-apis-software-and-data), que inclui expressamente a “CCF 3D Reference Object Library (data)” e liga a [licença CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). **REUTILIZAÇÃO CONDICIONAL.** O GLB não contém campo de copyright/licença: seu bloco `asset` informa apenas glTF 2.0 e o exportador Babylon.js para Maya. A cadeia depende da declaração oficial da biblioteca, não de metadado embutido. | Fonte do `site/assets/kidney.glb` e das vistas WebP. Atribuição distribuível: [`public/licenses/hubmap-kidney-CC-BY-4.0.html`](public/licenses/hubmap-kidney-CC-BY-4.0.html), com links clicáveis para a fonte e a licença e declaração de conversão para o derivado WebGL, decimação/simplificação da malha, otimização/compressão meshopt e texturização/materialização leve. Receita e hashes em `docs/amostra/assets/RECEITA-RIM-3D.md`. |
| `src/data/brazil-states.geojson` | [click_that_hood — brazil-states.geojson](https://github.com/codeforgermany/click_that_hood/blob/48ba05ad4c6969e3b3c25735492169227ae411f1/public/data/brazil-states.geojson), commit `48ba05ad4c6969e3b3c25735492169227ae411f1`, consultado em 16/09/2026 | **MIT**, no [LICENSE da mesma revisão](https://github.com/codeforgermany/click_that_hood/blob/48ba05ad4c6969e3b3c25735492169227ae411f1/LICENSE), copyright © 2013–2021 Code for America. **APTO PARA REUTILIZAÇÃO**. Texto integral preservado em [`public/licenses/click-that-hood-MIT.txt`](public/licenses/click-that-hood-MIT.txt). O arquivo local e a revisão citada são semanticamente idênticos após parse JSON; diferenças de bytes são apenas serialização. O GeoJSON não carrega licença embutida. | Geometria das 27 UFs. O gerador simplifica a geometria para SVG estático; mapa, seletor e tabela apontam para o mesmo agregado por UF. |
| `docs/amostra/site/favicon.svg` | Criação própria para DialisaSUS, 16/09/2026 | Não se aplica; não incorpora ativo externo | Identificação das rotas no navegador. |

---

## Conhecimento externo usado em decisão

Declarado porque o AI-Vault não cobria o tema — regra de `DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE`.

| Fonte | O que forneceu | Onde virou regra permanente |
|---|---|---|
| Skill `dataviz` | Método de forma → cor → validação → marcas → interação; as seis checagens; especificação de marca; anti-padrões | Virou `02-CONHECIMENTO/PADROES/PADRAO-DATAVIZ-ACESSIVEL.md` no Vault, em 15/09/2026 |
| Skill `design:accessibility-review` | Critérios WCAG 2.1 AA | idem, §7 da mesma nota |
| Skills `design:design-critique`, `anthropic-skills:docx`, `anthropic-skills:xlsx` | Crítica das 7 telas da v1; relatório em Word; planilha de reconciliação | `docs/CRITICA-V1.md`, `docs/RELATORIO-V1-V2.docx`, `docs/RECONCILIACAO-V1-V2.xlsx` |
