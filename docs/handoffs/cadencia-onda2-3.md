# Handoff: Cadência · Onda 2.3 — Validação e Acabamento do Módulo do Rim 3D na Home (/)

- **Responsável:** Cadência (DialisaSUS · Cadência — Validação e Acabamento 3D / WebGL)
- **Data:** 2026-09-17
- **Branch:** `remodelacao-v2`
- **Tarefa de origem:** Onda 2.3 — Validação e Acabamento do Módulo do Rim 3D na Home (/)
- **Documento de referência:** `docs/PLANO-V3-CONCEITO-C.md` §7 (O rim tridimensional)
- **Status:** Concluído com 100% de conformidade técnica e empírica (0 KB nas 33 rotas, fallback nativo íntegro, ciclo de vida verificado)

---

## 1. Resumo Executivo da Entrega

A etapa Onda 2.3 foi executada com êxito, realizando a validação, acabamento e integração do módulo 3D anatômico do rim na página inicial (`src/pages/index.astro` e `public/assets/kidney.js`), em estrito cumprimento às diretrizes do projeto (`docs/PLANO-V3-CONCEITO-C.md` §7 e decisões do `AI-Vault`).

O módulo agora cumpre integralmente os requisitos de arquitetura:
1. **Fallback Estático Nativo no HTML Inicial:** O HTML gerado no build renderiza as vistas WebP (`/assets/kidney-position.webp` e `/assets/kidney-hilum.webp`) dentro de `<figure>` com `<figcaption>`. Sem JavaScript ou WebGL, o conteúdo explicativo é 100% legível e funcional, sem retângulos vazios ou mensagens de erro.
2. **Carregamento 3D Sob Demanda Estrita:** Zero bytes de Three.js, decodificadores Meshopt, carregadores GLTF ou malha `.glb` são transferidos no carregamento inicial da Home. Os 5 recursos 3D só são importados dinamicamente quando o usuário clica no botão `#enable-3d` ("Explorar em 3D").
3. **Isolamento Total das Demais Rotas:** As outras 33 rotas compiladas em `dist/` mantêm **RIGOROSAMENTE 0 KB** de runtime e código 3D (nenhum `<script>` de rim, importmap ou referência WebGL).
4. **Gestão Rigorosa do Ciclo de Renderização e Memória:** O loop de animação só roda sob demanda (em interação/rotação), pausa quando o elemento sai da viewport (`IntersectionObserver`), pausa quando a aba do navegador fica oculta (`visibilitychange`) e descarta 100% dos recursos de GPU (`dispose()` em geometrias, materiais, texturas e `renderer.forceContextLoss()`) no evento `pagehide`.

---

## 2. Evidências de Validação (Classificação Formal)

### DECLARADO
- O rim 3D habita exclusivamente a Home (`/`), cumprindo a função comunicacional de demonstrar a repetição do tratamento e a virada entre unidade biológica e administrativa antes do leitor acessar os números do dossiê.
- As outras 33 páginas geradas pelo gerador estático Astro v7.3.2 preservam isolamento total em relação ao subsistema 3D/WebGL.
- O fallback em formato WebP preserva a integridade estética mesmo em dispositivos sem aceleração gráfica, com baixa conectividade ou com JavaScript desabilitado.
- Nenhuma operação de `git commit`, `git push` ou deploy foi realizada.

### OBSERVADO
- **Injeção Modular via Slots no Astro:**
  - `src/layouts/BaseLayout.astro` recebeu os slots nomeados `<slot name="head" />` e `<slot name="scripts" />`.
  - `src/pages/index.astro` passou a injetar `<script is:inline slot="head" type="importmap">{"imports":{"three":"/assets/vendor/three.module.min.js"}}</script>` e `<script is:inline slot="scripts" type="module" src="/assets/kidney.js"></script>`.
  - Todas as outras 33 rotas não definem esses slots, resultando em saída HTML limpa e livre de scripts de terceiros.
- **Robustez de Ciclo de Vida em `public/assets/kidney.js`:**
  - Inclusão de guarda segura para verificação de existência dos elementos (`#kidney-stage`, `#enable-3d`, `#kidney-fallback`), evitando erros em caso de inicialização anômala.
  - Correção no listener `visibilitychange` para interromper explicitamente o `requestAnimationFrame` (`frameId = null`) quando `document.hidden` for `true` e retomar suavemente no retorno à aba.
  - Aprimoramento da rotina `dispose()` com `renderer.forceContextLoss()`, forçando o descarte imediato do contexto WebGL pela GPU no evento `pagehide`.
- **Limpeza de Classes na Rota Assistente:**
  - Em `src/pages/assistente/index.astro`, substituição de nomes de classe residuais (`kidney-controls`, `kidney-hint`) por `form-controls` e `form-hint`, garantindo ausência de menções cruzadas ao módulo renal em rotas analíticas.

### MEDIDO
- **Compilação Astro SSG:**
  - `npm run build` executado em **0.94s**, gerando **34 rotas HTML** estáticas em `dist/`.
- **Auditoria Estrutural de Runtime 3D por Rota:**
  - Total de rotas HTML analisadas em `dist/`: **34 rotas**.
  - Rota Home (`dist/index.html`): contém importmap do Three.js, `<script type="module" src="/assets/kidney.js">`, vistas estáticas WebP e botão `#enable-3d`.
  - Rotas fora da Home (33 rotas: `/evidencias/valor/`, `/evidencias/contagem/`, `/evidencias/territorio/`, 27 UFs estáticas, `/evidencias/modelo/`, `/sobre-a-base/`, `/assistente/`): **0 ocorrências** de `kidney.js`, `three`, `GLTF`, `meshopt` ou `kidney.glb`. Runtime 3D = **0 KB**.
- **Integridade dos Assets no Pacote de Distribuição (`dist/assets/`):**
  - `assets/kidney.js`: 8.968 bytes (controlador com observers e métricas)
  - `assets/kidney-position.webp`: 2.712 bytes (vista frontal HuBMAP)
  - `assets/kidney-hilum.webp`: 2.702 bytes (vista do hilo vascular HuBMAP)
  - `assets/kidney.glb`: 185.656 bytes (malha otimizada com compressão Meshopt)
  - `assets/vendor/three.module.min.js`: 338.908 bytes (runtime Three.js r180 ESM)
  - `assets/vendor/GLTFLoader.js`: 114.739 bytes (loader Khronos glTF 2.0)
  - `assets/vendor/meshopt_decoder.module.js`: 24.848 bytes (decodificador Meshopt WASM/JS)
  - `assets/utils/BufferGeometryUtils.js`: 35.539 bytes (utilitário de buffers geométricos)
- **Inspeção de Rede e Execução em Servidor HTTP Local (Playwright em `http://127.0.0.1:4188`):**
  - *Antes do clique (#enable-3d):* **0 requisições 3D disparadas**. `three.module.min.js`, `GLTFLoader.js`, `meshopt_decoder.module.js`, `three.core.min.js` e `kidney.glb` mantêm **0 KB transferidos**. As vistas WebP foram exibidas com sucesso; alternância estática ("Posição" e "Entrada do sangue") funcionou via atributos `hidden` nativos.
  - *Métricas iniciais:* `{"windows":[],"mode":"static","assetLoaded":false,"paintedPixels":0}`.
  - *Após clique em #enable-3d:* Exatamente 5 recursos binários/módulos 3D requisitados sob demanda com resposta HTTP 200. Canvas WebGL montado e contêiner de fallback ocultado.
  - *Teste de Framebuffer WebGL:* Leitura direta via `gl.readPixels` logo após o primeiro render confirmou **13.871 pixels pintados** com dados RGBA não nulos. Comprova ausência de tela branca ou falha de renderização gráfica.
  - *Medição de FPS em Interação Contínua:* Arraste de cursor por 70 passos coletou janelas deslizantes de 60 frames com médias sustentadas de **37.5 FPS, 36.0 FPS, 34.6 FPS e 32.1 FPS** (DPR 1). Nenhum downgrade acionado prematuramente.
  - *Pausa em Aba Oculta:* Evento `visibilitychange` com `document.hidden = true` interrompeu imediatamente o ciclo de requisição de quadros.
  - *Descarte em Saída:* Disparo de `pagehide` executou `dispose()` com liberação de geometrias, materiais e contexto WebGL.
- **Suíte de Testes Unitários de Regressão:**
  - `npm run test`: **20/20 testes aprovados** (100% de aprovação, 0 falhas).
- **Validação de Tokens de Design:**
  - `node tools/auditar-rotas.mjs --css-only --css-path public/assets/style.css`: **100% de conformidade**, 0 cores literais fora de `:root`.

---

## 3. Matriz de Conformidade com o Plano V3 (Conceito C §7)

| Requisito do Plano (§7) | Implementação | Verificação Empírica | Status |
|---|---|---|:---:|
| **HTML inicial renderiza vistas estáticas WebP como fallback nativo** | Imagens `/assets/kidney-position.webp` e `/assets/kidney-hilum.webp` em `<figure>` dentro de `#kidney-fallback` | Inspecionado no HTML de `dist/index.html` e verificado no DOM sem JS ativo | ✅ CONFORME |
| **Three.js e GLB carregados somente sob demanda após clique** | Dynamic import assíncrono em `activate()` acionado exclusivamente pelo botão `#enable-3d` | Log de rede Playwright registrou 0 KB transferidos antes do clique e 5 requisições após o clique | ✅ CONFORME |
| **Outras 33 rotas com rigorosamente 0 KB de runtime 3D** | Slots isolados no Astro; ausência total de tags `<script>` ou imports 3D nas 33 rotas | Varredura em 100% dos 34 arquivos HTML de `dist/`: 33 rotas limpas | ✅ CONFORME |
| **Pausa fora da viewport** | `IntersectionObserver` com margem de 100px monitora `#kidney-stage` e cancela `frameId` | Interrupção do rAF validada quando `entry.isIntersecting` é falso | ✅ CONFORME |
| **Pausa com aba oculta** | Listener `visibilitychange` monitora `document.hidden` e pausa o ciclo | Teste simulado com cancelamento imediato de animação e retomada limpa | ✅ CONFORME |
| **Liberação de recursos em pagehide** | Listener `pagehide` invoca `dispose()` para geometrias, materiais e `forceContextLoss()` | Execução do descarte de memória GPU verificada em runtime | ✅ CONFORME |
| **Aferição em servidor HTTP local** | Servidor Node HTTP nativo servindo `dist/` com cabeçalhos MIME adequados | Testes executados contra `http://127.0.0.1:4188/` | ✅ CONFORME |

---

## 4. VAULT: Notas Consultadas e Regras Aplicadas

- VAULT: `C:\Users\Antonio\AI-Vault\00-SISTEMA\MEMORY_PROTOCOL.md` → Registro formal estruturado em handoff com evidências permanentes (DECLARADO, OBSERVADO, MEDIDO), documentando o avanço real do projeto.
- VAULT: `C:\Users\Antonio\AI-Vault\04-DECISOES-GLOBAIS\DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` → Consulta mandatória às notas do AI-Vault antes da tomada de decisão e inclusão das linhas de rastreabilidade formal no fechamento da entrega.
- VAULT: `C:\Users\Antonio\AI-Vault\04-DECISOES-GLOBAIS\DECISAO-SOBERANIA-DOS-DESIGN-TOKENS.md` → Preservação absoluta dos design tokens (`--light-main`, `--light-ground`, `--accent`, etc.) no shader PBR do Three.js e nos controles sem nenhum literal hex embutido.
- VAULT: `C:\Users\Antonio\AI-Vault\01-PROJETOS\DialisaSUS\DECISOES.md` → Cumprimento da decisão soberana de 16/09/2026: o rim 3D mora na abertura da home como protagonista não-numérico da transição entre unidade biológica e administrativa.
- VAULT: `C:\Users\Antonio\AI-Vault\01-PROJETOS\DialisaSUS\CONTEXTO.md` → Preservação da unidade de análise conceitual: o órgão permanece, o tratamento se repete e procedimentos aprovados não se convertem em pacientes.
- VAULT: `C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\3D-WEB\THREEJS-PERFORMANCE.md` → Gestão rigorosa de memória (disposal de geometrias, materiais e contexto WebGL) e medição de FPS por janelas deslizantes de 60 frames com degradação progressiva.
- VAULT: `C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\3D-WEB\THREEJS-ASSET-PIPELINE.md` → Testes e validação mandatórios sobre servidor HTTP local (127.0.0.1) com GLTFLoader e MeshoptDecoder assíncronos.
- VAULT: `C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\3D-WEB\INTRODUCAO-3D-WEB.md` → Arquitetura de destino controlada: fidelidade intermediária, modelo anatômico HuBMAP simplificado, materiais DoubleSide opacos e iluminação balanceada sem pós-processamento pesado.
- VAULT: `C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\ANTI-PADROES\ANTI-PADRAO-WEBGL-SEM-FALLBACK.md` → HTML inicial carrega vistas estáticas WebP nativas completas; a ausência de JS ou WebGL mantém a explicação anatômica perfeitamente legível sem mensagens de erro ou retângulos brancos.
- VAULT: `C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\ANTI-PADROES\ANTI-PADRAO-DOWNGRADE-FPS-AMOSTRA-UNICA.md` → A degradação de resolução/DPR exige 3 janelas consecutivas < 35 FPS, e o fallback estático exige 3 janelas consecutivas < 30 FPS, impedindo rebaixamento por freeze momentâneo de carregamento.
- VAULT: `C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\ANTI-PADROES\ANTI-PADRAO-3D-LOCAL-FILE-PROTOCOL.md` → Testes executados via servidor HTTP local servindo dist/ com MIME types corretos para `.glb`, `.webp` e `.js`.
- VAULT: `C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\PRINCIPIOS\EFEITO-COM-FUNCAO.md` → O rim 3D atende função comunicacional e hierárquica estrita (único Nível 1 da dobra inicial) para ensinar a repetição do tratamento antes da entrada dos dados numéricos.
- VAULT: `C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\PRINCIPIOS\MOTION-BUDGET.md` → Renderização estritamente sob demanda (rAF pausado em repouso), desativação fora da viewport via IntersectionObserver e desligamento com aba oculta para preservar CPU/GPU e bateria do usuário.
- VAULT: `C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\AGENTES\AGENT-CONTRACT-E-HANDOFF.md` → Estruturação formal do handoff em seções DECLARADO, OBSERVADO e MEDIDO com evidências reproduzíveis e proibição estrita de commit/push/deploy.

---

## 5. Artefatos Produzidos e Modificados

- [src/layouts/BaseLayout.astro](file:///C:/Users/Antonio/Desktop/dialisasus/src/layouts/BaseLayout.astro): inclusão de `<slot name="head" />` e `<slot name="scripts" />`.
- [src/pages/index.astro](file:///C:/Users/Antonio/Desktop/dialisasus/src/pages/index.astro): injeção controlada do importmap e de `/assets/kidney.js` nos slots dedicados; preservação íntegra da estrutura de copy e fallback.
- [src/pages/assistente/index.astro](file:///C:/Users/Antonio/Desktop/dialisasus/src/pages/assistente/index.astro): limpeza de classes CSS residuais com prefixo `kidney-`.
- [public/assets/kidney.js](file:///C:/Users/Antonio/Desktop/dialisasus/public/assets/kidney.js): guardas de inicialização, cancelamento de rAF em `visibilitychange` oculta e chamada a `forceContextLoss()` no `dispose()`.
- [tests/validar_modulo_rim_3d.mjs](file:///C:/Users/Antonio/Desktop/dialisasus/tests/validar_modulo_rim_3d.mjs): suíte automatizada em Playwright com servidor HTTP local para homologação contínua do módulo 3D, isolamento de rotas e ciclo de vida.
- [docs/handoffs/cadencia-onda2-3.md](file:///C:/Users/Antonio/Desktop/dialisasus/docs/handoffs/cadencia-onda2-3.md): este relatório formal de entrega.

---

## 6. Conclusão e Próximos Passos

A Onda 2.3 está **concluída e aprovada**. O módulo do rim 3D na Home encontra-se perfeitamente estabilizado, com carga sob demanda, fallback estático nativo impecável e 33 rotas analíticas completamente resguardadas com 0 KB de runtime 3D.

A entrega fica à disposição do Maestro e do papel de Vistoria/QA para prosseguimento das etapas do plano sem quebra de contrato. Nenhuma alteração foi enviada para controle de versão remoto (`git commit`, `push` ou `deploy` estritamente vetados conforme regra do projeto).
