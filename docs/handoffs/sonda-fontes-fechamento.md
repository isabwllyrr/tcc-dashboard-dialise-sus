# Handoff: Sonda · Fechamento de fontes, licenças e atribuições

- **Responsável:** Sonda (OpenAI Codex)
- **Data:** 2026-09-16
- **Branch:** `remodelacao-v2`
- **Tarefa:** `docs/tarefas/sonda-licencas-fontes.md`
- **Status:** concluído

---

## Resultado

As quatro pendências documentais foram fechadas:

1. `meshoptimizer`/`meshopt_decoder.module.js` auditado contra a tag, o pacote npm/unpkg, o arquivo oficial e a licença MIT.
2. Textos integrais e byte a byte idênticos das licenças MIT de Three.js, meshoptimizer e click_that_hood adicionados a `public/licenses/`.
3. Atribuição do rim HuBMAP publicada como HTML distribuível, com links clicáveis para a fonte, a licença CC BY 4.0 e a FAQ oficial, além da lista explícita de modificações.
4. `SOURCES.md` corrigido: Three.js e meshoptimizer pertencem exclusivamente à rota `/` (home), sob demanda após o clique de inspeção 3D; não pertencem a `/evidencias/contagem/`.

Nenhum commit, push ou deploy foi executado.

---

## 1. Auditoria do meshoptimizer

### Cadeia de procedência

- Repositório oficial: <https://github.com/zeux/meshoptimizer>
- Revisão fixada: tag leve [`v0.22`](https://github.com/zeux/meshoptimizer/tree/v0.22) → commit `4affad044571506a5724c9a6f15424f43e86f731`
- Pacote: [`meshoptimizer@0.22.0`](https://unpkg.com/meshoptimizer@0.22.0/)
- Arquivo oficial: <https://github.com/zeux/meshoptimizer/blob/v0.22/js/meshopt_decoder.module.js>
- Arquivo unpkg: <https://unpkg.com/meshoptimizer@0.22.0/meshopt_decoder.module.js>
- Licença formal: <https://github.com/zeux/meshoptimizer/blob/v0.22/LICENSE.md>
- Autor/detentor declarado: Arseny Kapoulkine, copyright © 2016–2024
- Consulta: 16/09/2026

### Evidências

- **DECLARADO:** o cabeçalho do arquivo local informa “Built from meshoptimizer 0.22”, distribuição sob MIT e autoria de Arseny Kapoulkine.
- **DECLARADO:** `package.json` do pacote 0.22.0 declara `author: Arseny Kapoulkine`, `license: MIT` e o repositório oficial `zeux/meshoptimizer`.
- **OBSERVADO:** tag, pacote, arquivo e licença responderam publicamente; a tag `v0.22` resolve para o commit acima.
- **MEDIDO:** `docs/amostra/site/assets/vendor/meshopt_decoder.module.js`, o arquivo da tag e o arquivo do unpkg são byte a byte idênticos: 24.848 bytes, SHA-256 `784315b6959c85459eab77f51776158cc381d7e7d77b919ff7c4935f088a7c5c`.
- **OBSERVADO:** o decoder é importado sob demanda por `kidney.js` e decodifica `EXT_meshopt_compression` no GLB otimizado.

Veredito: **APTO PARA REUTILIZAÇÃO — MIT**, com o texto integral da licença preservado na distribuição.

---

## 2. Licenças e aviso distribuídos

Os três arquivos MIT abaixo são cópias integrais e byte a byte idênticas às licenças das revisões auditadas:

| Arquivo distribuído | Origem fixada | Bytes | SHA-256 |
|---|---|---:|---|
| `public/licenses/three-js-MIT.txt` | Three.js `r180` | 1.081 | `bfe119ea4fd413f5f7ca3fcd63adb0c4a073ed39daa2fe7d3e6b769e21272601` |
| `public/licenses/meshoptimizer-MIT.txt` | meshoptimizer `v0.22` | 1.079 | `d1bc307ff896c7fc65e3ff4823cc478194f7a5bc6436f99534ebede4d9e2017a` |
| `public/licenses/click-that-hood-MIT.txt` | click_that_hood `48ba05ad4c6969e3b3c25735492169227ae411f1` | 1.079 | `4895ffb278e3c7238b10594a36d4c5085dc150ca1c8d32f32958daaeb84059c9` |

O aviso CC BY é autoral e distribuído separadamente:

| Arquivo distribuído | Bytes | SHA-256 |
|---|---:|---|
| `public/licenses/hubmap-kidney-CC-BY-4.0.html` | 1.405 | `fc7e02d9b8f811393c4153e2f8ee7042a6fa6167e5bbef2328d4738fdb5f88d7` |

---

## 3. Atribuição do rim HuBMAP

Texto formalizado em [`public/licenses/hubmap-kidney-CC-BY-4.0.html`](../../public/licenses/hubmap-kidney-CC-BY-4.0.html):

> “HuBMAP CCF 3D Reference Object Library — VH_F_Kidney_L.glb, v1.2”, HuBMAP Consortium. Fonte: arquivo original do rim esquerdo. Licenciado sob Creative Commons Attribution 4.0 International — CC BY 4.0.

O documento contém hyperlinks HTML reais para:

- o [GLB original v1.2](https://ccf-ontology.hubmapconsortium.org/objects/v1.2/VH_F_Kidney_L.glb);
- a [licença CC BY 4.0](https://creativecommons.org/licenses/by/4.0/);
- a [FAQ oficial do HuBMAP](https://docs.hubmapconsortium.org/faq.html#what-are-the-licensing-requirements-to-use-hubmap-apis-software-and-data), que declara a licença da CCF 3D Reference Object Library.

Modificações declaradas no aviso:

- conversão do original em derivado preparado para visualização WebGL;
- decimação e simplificação da malha;
- otimização e compressão meshopt;
- texturização/materialização leve para apresentação;
- geração de vistas estáticas WebP;
- ausência de endosso do HuBMAP ao DialisaSUS.

O aviso preserva a distinção factual: o GLB original não traz licença embutida; a licença vem da declaração oficial da biblioteca na FAQ do HuBMAP.

---

## 4. Correção da rota do Three.js

`SOURCES.md` agora registra:

- Three.js exclusivamente em `/` (home);
- carregamento somente após o clique no botão de inspeção 3D;
- uso conjunto do decoder meshoptimizer no mesmo fluxo sob demanda;
- declaração explícita de que Three.js não é usado em `/evidencias/contagem/`.

A correção segue a decisão vigente do projeto: o rim 3D é o protagonista não numérico da abertura narrativa na home.

---

## 5. Validação empírica

- **MEDIDO:** `npm run build` terminou com código 0; Astro gerou 7 páginas estáticas.
- **OBSERVADO:** o build copiou os quatro documentos para `dist/licenses/` sem alteração de hash.
- **MEDIDO:** servindo `dist/` por HTTP em `127.0.0.1:4179`, os quatro documentos responderam HTTP 200:
  - `/licenses/three-js-MIT.txt` — `text/plain`, 1.081 bytes;
  - `/licenses/meshoptimizer-MIT.txt` — `text/plain`, 1.079 bytes;
  - `/licenses/click-that-hood-MIT.txt` — `text/plain`, 1.079 bytes;
  - `/licenses/hubmap-kidney-CC-BY-4.0.html` — `text/html`, 1.405 bytes.
- **MEDIDO:** o HTML contém os três `href` externos esperados e as quatro categorias de modificação exigidas: WebGL, decimação/simplificação, meshopt e texturização/materialização leve.

---

## Critérios de aceite

- [x] `meshoptimizer` documentado com licença MIT, procedência, versão, revisão e hash.
- [x] Textos integrais das três licenças MIT armazenados em `public/licenses/` e presentes no build.
- [x] Atribuição CC BY 4.0 do HuBMAP com links clicáveis e lista de modificações.
- [x] `SOURCES.md` corrigido para o 3D exclusivamente em `/`.
- [x] Handoff entregue com evidências e linhas `VAULT:`.
- [x] Nenhum commit, push ou deploy.

---

VAULT: `00-SISTEMA/MEMORY_PROTOCOL.md` → evidências operacionais ficaram no handoff; nenhuma nova nota permanente foi criada sem necessidade.

VAULT: `04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` → Vault consultado antes da execução e regras aplicadas registradas na entrega.

VAULT: `01-PROJETOS/DialisaSUS/AUDITORIA-SQUAD-REMODELACAO-2026-09-16.md` → fechadas as três pendências atribuídas à Sonda: meshoptimizer, rota do Three.js e avisos distribuídos.

VAULT: `02-CONHECIMENTO/PROCESSOS/UI-LICENSE-CHECK.md` → biblioteca, arquivo distribuído, dependência, licença, autoria e obrigações foram verificados por camada.

VAULT: `02-CONHECIMENTO/PRINCIPIOS/SOURCE-FIRST-UI.md` → componentes existentes foram preservados e documentados em vez de substituídos sem necessidade.

VAULT: `01-PROJETOS/DialisaSUS/DECISOES.md` → rim 3D mantido exclusivamente na abertura narrativa da home e proibição de commit, push e deploy respeitada.
