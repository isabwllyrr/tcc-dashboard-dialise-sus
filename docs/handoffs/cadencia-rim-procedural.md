# Cadência — rim 3D procedural: construído, integrado e medido

**Papel:** Cadência. **Tarefa:** construir em código um rim realista e deixá-lo funcionando na home. **Data:** 18/09/2026. **Branch:** `main`. **Sem commit, push, preview ou deploy até autorização.**

> Execução iniciada pelo Codex/astra-6 e **concluída por Claude** após o esgotamento de créditos daquele agente, mantendo o mesmo método, os mesmos geradores e a mesma bateria de medição. O que estava em curso no momento da interrupção era a repetição das capturas depois de duas correções: a quantização de posições e o descompasso entre a altura do buffer e a altura CSS do canvas.

## Resultado

**O requisito foi atendido.** O rim é gerado por código, é autoria do projeto, não depende de licença de terceiro e renderiza na home. O ativo HuBMAP rejeitado não é mais referenciado pela rota.

## O que foi construído

| Artefato | Papel |
|---|---|
| `scripts/gerar_rim.mjs` | Gerador determinístico: malha, mapas e materiais. Seed `18473` |
| `public/assets/kidney.glb` | Ativo publicado, 568.228 B |
| `docs/amostra/assets/source/rim-procedural-master.glb` | Master preservado sem modificação |
| `public/assets/kidney-position.webp` · `kidney-hilum.webp` | Fallbacks renderizados do modelo publicado |
| `public/assets/kidney.js` | Módulo reescrito: PBR nativo, sem sobrescrita de material |
| `tools/inspecionar-rim.mjs` · `auditar-rim-procedural.mjs` · `testar-rim-lifecycle.mjs` | Bateria de verificação |
| `docs/amostra/assets/RECEITA-RIM-PROCEDURAL.md` | Receita reproduzível |

## Forma

Cápsula fechada com fenda medial profunda no terço médio e borda lateral convexa; polo superior mais largo que o inferior; deslocamento por ruído fractal determinístico. Três estruturas curtas saindo do hilo — artéria renal, veia renal e ureter — dão leitura ao enquadramento "Entrada do sangue".

Duas correções durante a execução:

1. **Primeira versão ficou alongada e o hilo saiu como uma ruga estreita.** Concavidade aprofundada, ombros dos polos ampliados, normal map suavizado.
2. **A quantização padrão fazia vértices vizinhos coincidirem.** Com posições em **16 bits**, as quatro malhas ficaram sem bordas abertas e sem arestas não manifold.
3. **Descompasso entre altura do buffer e altura CSS do canvas** alongava a imagem no desktop. Corrigido, capturas refeitas.

## As nove medições

Máquina: **Intel i7-1255U com Iris Xe Graphics**, Windows 11, Chrome 153. Servido por HTTP em `127.0.0.1:4328`. Evidência bruta em `docs/evidencias/rim-procedural/`.

| # | Critério | Resultado |
|---|---|---|
| 1 | Gerador determinístico | **Confirmado.** Duas execuções, SHA-256 idênticos nos dois arquivos — `determinismo.json` |
| 2 | Mapas no GLB | **3 imagens embutidas**: albedo vascular, normal, AO/rugosidade. 63.420 B de textura |
| 3 | Triângulos | **88.368**, dentro da faixa de 60 mil a 120 mil. Nenhuma simplificação por ratio |
| 4 | Pixels verdes | **Zero** nos dois enquadramentos. Critério: HSV H=145–195°, S>0,2, alfa≥240. Matiz observado entre 4 e 10; luminância de 36 a 150, provando textura e não cor chapada |
| 5 | Framebuffer | **68.191 pixels pintados** |
| 6 | Capturas | `position.png` e `hilum.png` por HTTP, tema claro. **O hilo está visível** no enquadramento "Entrada do sangue", com as três estruturas |
| 7 | Peso gzip | GLB **362.653 B** · texturas **63.420 B** · **total 607.700 B** contra o teto de 768.000 B. **Cabe** |
| 8 | FPS | **3 janelas de 90 frames a 60 FPS**, dpr 1,5, durante interação, depois do carregamento |
| 9 | Isolamento | **33 rotas, todas 200, zero requisições 3D**. Antes do clique em "Explorar em 3D": **nenhuma requisição** de Three.js, loader ou GLB |

## Além dos nove

| Verificação | Resultado |
|---|---|
| Render sob demanda | `idleRenders: 0` · `offscreenRenders: 0` |
| Escada de degradação | Funciona nos três degraus: interativo → densidade reduzida com enquadramento fixo → vistas estáticas |
| Perda de contexto WebGL | Fallback assume |
| Falha de download do GLB | Fallback assume |
| Sem JavaScript | Os dois WebP carregam do HTML inicial |
| Sem WebGL | Fallback assume |
| Movimento reduzido e teclado | Estados alcançáveis |
| Toque | Funciona |
| Descarte de recursos | Contexto liberado na saída |
| Erros de console | Nenhum |

## O que **não** foi medido

- **Aparelho físico de entrada.** Toda a medição de FPS é na Iris Xe. O comportamento em celular de baixo custo continua sendo a maior incerteza.
- **Aba oculta.** O headless não conseguiu ocultar a aba real; o teste usou um getter injetado. É teste funcional, não observação do comportamento real.
- Os números de FPS do `lifecycle.json` usam relógio rAF injetado e **não são benchmark** — servem para provar que a escada de degradação dispara, não para medir desempenho.

## Pendências herdadas, fora desta tarefa

Continuam abertas e não foram tocadas aqui: a pergunta norteadora e a virada ausentes da home, o tema escuro inexistente no build, o alvo padrão do `auditar-rotas.mjs` apontando para a v1 em produção, e os dois documentos de QA da Vistoria.

## Procedência

`SOURCES.md` registra o ativo como **autoria do projeto, gerado proceduralmente**, com gerador, seed e master. Os registros HuBMAP permanecem no arquivo como **históricos**, explicitamente marcados como pertencentes ao ativo rejeitado e à amostra antiga, sem atribuir origem ao GLB da home. `RECEITA-RIM-3D.md` segue como receita histórica; a vigente é `RECEITA-RIM-PROCEDURAL.md`.

---

VAULT: `02-CONHECIMENTO/PADROES/ASSET-RECIPE.md` → receita reproduzível com seed, parâmetros e hashes, independente de quem gerou.
VAULT: `02-CONHECIMENTO/PRINCIPIOS/PRINCIPIO-ASSET-CONTROLADO.md` → referência, direção, restrições, geração e QA; toda saída tratada como hipótese até passar na verificação.
VAULT: `02-CONHECIMENTO/3D-WEB/GLB-GLTF-NORMALIZACAO.md` → Two-Group Pattern e escala uniforme preservando a proporção 1 : 0,55 : 0,27.
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-DECIMACAO-AGRESSIVA.md` → nenhuma simplificação por ratio; 88.368 triângulos mantidos para a silhueta não facetar.
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-RAW-SHADER-DESCARTA-PBR-DO-THREE.md` → PBR nativo do Three com clearcoat e sheen, sem shader próprio.
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-WEBGL-SEM-FALLBACK.md` → fallback no HTML inicial, verificado sem JS, sem WebGL e com falha de download.
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-3D-LOCAL-FILE-PROTOCOL.md` → toda a bateria executada por HTTP.
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-DOWNGRADE-FPS-AMOSTRA-UNICA.md` → três janelas consecutivas de 90 frames; frame isolado não aciona degradação.
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-PROVAS-FALSAS-OU-INVENTADAS.md` → o que não foi medido está declarado como não medido, com o motivo.
VAULT: `04-DECISOES-GLOBAIS/DECISAO-SOBERANIA-DOS-DESIGN-TOKENS.md` → token de marca não colore anatomia; a sobrescrita por `--accent` foi removida.
VAULT: `02-CONHECIMENTO/PROCESSOS/UI-LICENSE-CHECK.md` → ativo de autoria própria, sem licença de terceiro; registro feito na mesma alteração.
