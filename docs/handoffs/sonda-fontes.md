# Handoff: Sonda · Verificação de fontes e licenças

- **Responsável:** Sonda (Codex)
- **Data:** 2026-09-16
- **Branch:** `remodelacao-v2`
- **Tarefa:** `docs/tarefas/sonda-fontes.md`
- **Status:** concluído com cadeias confirmadas e ressalvas de distribuição explicitadas

---

## Resultado

As três cadeias de procedência estão confirmadas. URLs de origem e licença responderam publicamente, sem autenticação, em 16/09/2026. As versões/revisões são reproduzíveis e os arquivos locais correspondem às origens fixadas.

`SOURCES.md` foi ajustado para registrar o commit resolvido do Three.js, o caráter condicional da CC BY 4.0 e as obrigações de distribuição que ainda precisam ser fechadas antes da versão de produção. Não houve alteração em código, interface, dados ou assets.

| Fonte | Veredito de origem/licença | Resultado |
|---|---|---|
| Three.js r180 / 0.180.0 | **APTO PARA REUTILIZAÇÃO — MIT** | origem, versão, tag, commit e licença confirmados; 4 arquivos locais idênticos ao unpkg |
| Rim `VH_F_Kidney_L.glb` v1.2 | **REUTILIZAÇÃO CONDICIONAL — CC BY 4.0** | arquivo remoto/local idêntico; licença confirmada pela FAQ oficial; ausência de licença embutida confirmada |
| `brazil-states.geojson` | **APTO PARA REUTILIZAÇÃO — MIT** | commit fixado, licença do mesmo commit e igualdade semântica confirmados |

---

## 1. Three.js r180

### Cadeia

- Origem: <https://github.com/mrdoob/three.js/tree/r180>
- Versão npm/unpkg: `0.180.0`
- Tag anotada: `r180` → objeto de tag `9e8635e2031c25859dc47ba07e72230dccb2682a` → commit `0af9729d0c143a86a1d725d6e2c3ad83301f3f34`
- Licença formal: <https://github.com/mrdoob/three.js/blob/r180/LICENSE>
- Declaração complementar: `package.json` de `three@0.180.0` contém `"license": "MIT"`
- Consulta: 16/09/2026

### Evidências

- **DECLARADO:** o `LICENSE` da revisão r180 é MIT e atribui copyright a `three.js authors`; o pacote 0.180.0 também declara MIT.
- **OBSERVADO:** as páginas da tag e do `LICENSE` responderam HTTP 200. Os bundles locais preservam cabeçalho `SPDX-License-Identifier: MIT` e copyright.
- **MEDIDO:** os quatro arquivos locais são byte a byte idênticos aos respectivos arquivos de `unpkg.com/three@0.180.0/`:

| Arquivo | SHA-256 |
|---|---|
| `three.module.min.js` | `e2b5ee6bccd38fd6d8a2428546b83c5f2426d84b152ef82be8055556e3b40eb6` |
| `three.core.min.js` | `61ba0df005b05991361d040d8ff670e1aadfd0ce7aeebd1fdb0725957a8957de` |
| `GLTFLoader.js` | `67ac5551fdafa6e349bd80c8f8e5e39c136d6b2fb1ad647db9abb21dc86f9e4a` |
| `BufferGeometryUtils.js` | `fda7e946b8e0b5ab39b779206589e7a1079a22eb24efb89d7223e03fdfb1f751` |

### Ressalva de distribuição

A licença MIT exige que o aviso de copyright e o texto de permissão acompanhem cópias ou porções substanciais. O cabeçalho SPDX dos bundles não contém o texto integral; não há arquivo `LICENSE`/`NOTICE` no artefato da amostra. Antes da distribuição de produção, incluir o texto MIT do Three.js no pacote publicado ou em um arquivo de licenças de terceiros que o acompanhe.

---

## 2. GLB do rim — HuBMAP CCF

### Cadeia

- Origem versionada: <https://ccf-ontology.hubmapconsortium.org/objects/v1.2/VH_F_Kidney_L.glb>
- Versão: `v1.2`, fixada no caminho da URL
- Licença formal da biblioteca: <https://docs.hubmapconsortium.org/faq.html#what-are-the-licensing-requirements-to-use-hubmap-apis-software-and-data>
- Licença ligada pela própria FAQ: <https://creativecommons.org/licenses/by/4.0/>
- Consulta e download: 16/09/2026

### Evidências

- **DECLARADO:** a FAQ oficial afirma expressamente que a `CCF 3D Reference Object Library (data)` é publicada sob Creative Commons Attribution 4.0 International. A mesma página identifica a biblioteca como fonte de órgãos de referência anatômicos.
- **OBSERVADO:** a FAQ é pública, acessível sem login e respondeu HTTP 200. O GLB também respondeu HTTP 200 como `binary/octet-stream`.
- **OBSERVADO:** o bloco `asset` do GLB contém somente `version: 2.0` e `generator: babylon.js glTF exporter for Autodesk MAYA 2022.2 v20211115.1`; não há campo de licença ou copyright. Portanto, a licença vem da declaração oficial da biblioteca, exatamente como registrado em `SOURCES.md`.
- **MEDIDO:** arquivo remoto e original local são byte a byte idênticos, ambos com 1.330.900 bytes e SHA-256 `8ac1228e4db8c07cbf9f6c6dc7ca522c5b8d61f641927233a29ae6609b577403`.

### Ressalva de atribuição

O arquivo usado na amostra é derivado: foi otimizado, simplificado e recomprimido conforme `docs/amostra/assets/RECEITA-RIM-3D.md`. A CC BY 4.0 exige crédito apropriado, link para a licença e indicação das mudanças. O crédito atual na página identifica HuBMAP, a biblioteca, o rim esquerdo e “CC BY 4.0”, mas ainda não contém link para a licença nem declara a otimização. Isso não quebra a cadeia de procedência, porém deve ser corrigido antes da distribuição de produção.

---

## 3. `brazil-states.geojson`

### Cadeia

- Origem fixada: <https://github.com/codeforgermany/click_that_hood/blob/48ba05ad4c6969e3b3c25735492169227ae411f1/public/data/brazil-states.geojson>
- Commit: `48ba05ad4c6969e3b3c25735492169227ae411f1`
- Licença formal na mesma revisão: <https://github.com/codeforgermany/click_that_hood/blob/48ba05ad4c6969e3b3c25735492169227ae411f1/LICENSE>
- Detentor declarado: copyright © 2013–2021 Code for America
- Consulta: 16/09/2026

### Evidências

- **DECLARADO:** o `LICENSE` da revisão fixada é MIT e identifica Code for America como detentor do copyright.
- **OBSERVADO:** arquivo e licença na revisão completa responderam HTTP 200. O GeoJSON não contém licença embutida; a declaração aplicável está no `LICENSE` do repositório na mesma revisão.
- **MEDIDO:** remoto e local têm 27 features; a comparação após parse JSON e canonicalização recursiva foi verdadeira. A diferença de bytes é somente serialização: remoto 3.378.231 bytes / SHA-256 `f73a5975de5552ffa24d02cab89a07f444e3035a5f8e05943cba844ce0153f1`; local 3.465.065 bytes / SHA-256 `7fd2152b10c74b7d1f6306a1a8b807082b1f1df8a4f2f88b6b691dca68cfd237`.

### Ressalva de distribuição

Como no Three.js, a MIT exige preservação do aviso de copyright e do texto da licença. O registro de procedência está correto, mas o texto integral da MIT do `click_that_hood` ainda deve acompanhar o artefato distribuído antes da versão de produção.

---

## Critérios de aceite

- [x] Três fontes auditadas contra as origens remotas.
- [x] URL e revisão/versão conferidas.
- [x] Licença formal localizada na revisão ou na declaração oficial aplicável.
- [x] Data de consulta registrada: 16/09/2026.
- [x] Cadeia CC BY 4.0 do GLB confirmada documentalmente na FAQ pública do HuBMAP.
- [x] Ausência de licença embutida no GLB confirmada e descrita sem inferência indevida.
- [x] `SOURCES.md` factual e metodologicamente atualizado.
- [ ] Fechamento das obrigações no artefato de produção: licenças MIT completas; link CC BY e indicação de modificação no crédito do rim. Fora do escopo desta verificação documental e registrado para o gate de publicação.

## Restrições respeitadas

- Nenhum commit, push ou deploy executado.
- Nenhum número do TCC, recorte, método, narrativa ou linguagem visual alterado.
- Branch confirmada: `remodelacao-v2`.
- Identidade no Maestri confirmada: `Sonda`.

---

VAULT: `00-SISTEMA/MEMORY_PROTOCOL.md` → execução separou estado operacional de memória permanente e não gravou log efêmero no Vault.

VAULT: `04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` → Vault consultado antes da auditoria e regras aplicadas registradas no handoff.

VAULT: `02-CONHECIMENTO/PROCESSOS/UI-LICENSE-CHECK.md` → código, asset, declaração de licença e obrigações foram auditados separadamente; ausência de licença embutida não foi tratada como prova de licença.

VAULT: `02-CONHECIMENTO/PRINCIPIOS/SOURCE-FIRST-UI.md` → fontes reutilizadas foram mantidas com origem, versão, licença e compatibilidade documental verificadas.

VAULT: `01-PROJETOS/DialisaSUS/DECISOES.md` → preservados o contexto de TCC, o plano aprovado e a proibição de commit, push e deploy sem autorização.
