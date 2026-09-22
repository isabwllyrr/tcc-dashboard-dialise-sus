# Rim novo — aquisição bloqueada

Autor: Codex (agente desta tarefa). Consulta: 18/09/2026. Branch: `remodelacao-v2`, criada a partir da `main` limpa por instrução expressa desta tarefa. Nenhum commit, push, preview ou deploy.

**Requisito aberto. Nenhum novo ativo escolhido, baixado ou integrado.** A busca não fechou simultaneamente conteúdo PBR obrigatório, acesso ao original e cadeia de licença. Interrompida no gate solicitado pelo usuário. O módulo rejeitado ainda está no produto; isso não constitui aprovação nem tentativa de recuperá-lo.

## Candidatos, na ordem solicitada

1. **NIH 3D:** [Kidney Female Left, 3DPX-020967](https://3d.nih.gov/entries/3DPX-020967) pertence à biblioteca HRA/Visible Human já usada. Não selecionado para substituir o ativo rejeitado. [Human Kidney Model 3D, 3DPX-023373](https://3d.nih.gov/entries/3DPX-023373?version=1) oferece `thehuman_kidney.glb` na [página de download](https://3d.nih.gov/entries/download/23373/1), mas a página consultada não expôs a licença nem inventário de mapas. A descrição atribui copyright a Hyes, enquanto o cadastro é de Johnson J: procedência não fechada; não assumir domínio público pelo domínio NIH. Arquivo não baixado; metadados internos não verificados.
2. **BodyParts3D:** o [catálogo oficial](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) oferece malhas OBJ; não encontrei declaração de conjunto albedo/normal/roughness. Não selecionado por conteúdo não comprovado, não por proibição de licença. A [página oficial de licença](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), atualizada em 27/02/2025, declara **CC BY 4.0**, divergindo dos espelhos antigos CC BY-SA 2.1 Japan. Atribuição exigida: BodyParts3D / The Database Center for Life Science. Não foi adquirido pacote para inspeção interna.
3. **Z-Anatomy:** o [README do próprio projeto](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/master/Readme.md) declara licença geral CC BY-SA 4.0, mas identifica especificamente o rim de **Lissie Cowley como CC BY-NC 4.0**. Descartado do conjunto autorizado de licenças. Não herdar a licença geral do atlas para o órgão. CC BY-SA seria viável para um ativo do TCC se aceitas atribuição visível, indicação das alterações e distribuição do derivado sob a mesma licença; isso não elimina a restrição NC deste componente.
4. **Sketchfab — [Kidney / cgmac](https://sketchfab.com/3d-models/kidney-686992c2a7fb456eaa8997b0366f4062):** API oficial `/v3/models/686992c2a7fb456eaa8997b0366f4062` declara CC BY 4.0 e download disponível; página também declara CC BY, porém a descrição menciona standard royalty free. Anuncia diffuse e normal 4K, sem roughness. O botão oficial de download abriu login na sessão disponível. Não selecionado: roughness não comprovado, texto de licença ambíguo e original inacessível sem autenticação. Nenhum recurso do viewer foi extraído para contornar o download.
5. **Sketchfab — [Human Kidney / neshallads](https://sketchfab.com/3d-models/human-kidney-e1476ceb1e3b4412af5418eee9c5ed08)** e [Medicine: Organ / Safiya](https://sketchfab.com/3d-models/medicine-organ-the-human-kidney-54bd93f545064617bbef79013efd2192): APIs oficiais dos respectivos IDs confirmam CC BY 4.0 e download disponível. Descrições não comprovam o conjunto de três mapas; não selecionados, ainda inconclusivos. Arquivos não baixados. Não confundir inconclusivo com prova de que não contêm mapas.
6. **Pago — [Kidney – Realistic Human Anatomy / BeshMesh, CGTrader](https://www.cgtrader.com/3d-models/science/medical/kidney-9d3f6e2d-f694-432d-b44b-69b3ea71187f): US$ 39,00** na consulta, licença **Royalty Free License (no AI)**. Declara diffuse/roughness/normal 4K e arquivo Blender. É candidato comercial, **não aprovado**: hilo, proporções e integridade ainda não inspecionados. Os [termos §21A e §21B](https://www.cgtrader.com/pages/terms-and-conditions) limitam redistribuição a produto incorporado e exigem medidas contra extração. Minha avaliação: colocar master no repositório distribuído e GLB acessível publicamente não tem autorização demonstrada por esses termos; requer permissão específica antes de considerar compra. Compra não realizada nem recomendada como solução já validada.

A pesquisa não demonstra que inexiste um rim livre adequado; demonstra que nenhum dos candidatos examinados passou todos os gates nesta execução.

## Cadeia de licença do substituto

- URL exata do arquivo baixado: **não existe; nenhum download de ativo novo**.
- Licença e declaração: apenas declarações dos candidatos acima; nenhuma cadeia fechada para arquivo adquirido.
- Data de consulta: 18/09/2026.
- Licença nos metadados do arquivo novo: **não verificado**; não afirmar ausência sem o arquivo.
- Obrigações se adotado CC BY: crédito visível ao autor, link de origem/licença, aviso das alterações. Se CC BY-SA: também manter a licença no derivado.
- Modificações realizadas em novo ativo: nenhuma. Otimização, reenquadramento e exportação de fallback exigirão aviso de modificação.
- `SOURCES.md` recebeu o status de aquisição aberta, sem atribuir licença de candidato a um arquivo inexistente.

## Medições dos nove critérios

Evidência local reproduzível: `node tools/medir-rim-baseline.mjs` → `docs/handoffs/cadencia-rim-baseline.json`. Mede os arquivos anteriores, não um substituto.

| Critério | Resultado |
|---|---|
| 1. JSON e mapas | Anterior: `images=0`; três materiais, todos sem baseColorTexture, normalTexture, metallicRoughnessTexture e occlusionTexture. Novo: não medido. |
| 2. Estruturas | Master anterior: **19 nós, 15 malhas, 3 materiais**. Publicado anterior: **3 nós, 3 malhas, 3 materiais**. Nome do hilo só no master. Contagem e perda de nome não provam sozinhas exclusão de geometria, pois `join` pode fundi-la. Não foi feita comparação geométrica. Novo: não medido. |
| 3. Screenshots HTTP | Não medido; nenhum novo modelo para fotografar nos dois enquadramentos. |
| 4. Pixels verdes | Não medido. Sobrescrita pelo token `--accent` confirmada na leitura de `public/assets/kidney.js`. |
| 5. Framebuffer | Não medido. |
| 6. Peso gzip | Anterior: runtime **222.751 B**; GLB **143.346 B**; texturas do modelo **0 B**; soma **366.097 B** (~357,52 KiB), sem contar os dois fallbacks e demais arquivos da página. Runtime inclui módulo do órgão, Three core/module, loader, Meshopt e BufferGeometryUtils. Compressão gzip nível 9 por arquivo, não transferência HTTP medida. GLB bruto: 185.656 B. Novo/delta: não medido; nenhuma meta declarada atingida. |
| 7. FPS em interação | Não medido; aparelho de benchmark não utilizado. Nenhuma janela registrada. |
| 8. Outras 33 rotas | Não medido por HTTP. Não houve alteração de runtime ou rotas; isso não substitui auditoria de rede. |
| 9. Fontes e receita | Aquisição aberta registrada. Receita anterior marcada histórica; hashes anteriores no JSON de baseline. Receita e hashes de substituto inexistentes. |

## Comandos e alterações

- Executado: `git switch -c remodelacao-v2`.
- Executado: `node tools/medir-rim-baseline.mjs` (JSON glTF, SHA-256, gzip por arquivo).
- Comandos de otimização: **nenhum executado**. Não há master novo licenciado.
- Arquivos de produção, GLB e WebPs: nenhuma alteração.
- Código de render, PMREM, Two-Group Pattern, câmera, FPS e descarte: implementação pendente, dependente da aquisição.
- Testes por HTTP: não executados. Nenhum teste por `file://`.

## Retomada

Retomar com um pacote original que contenha albedo, normal e roughness e uma declaração inequívoca de licença para esse pacote. Para os candidatos Sketchfab, download oficial autenticado permite verificar o conteúdo; não garante aprovação. Para a opção paga, obter autorização de redistribuição compatível com master no repositório e GLB web antes de gastar. Depois fechar `SOURCES.md` na mesma alteração do arquivo, preservar master, executar `dedup`, `weld`, `resample`, `textureCompress` em 1024 e `meshopt`, sem simplificação por ratio; implementar render e cumprir os nove testes.

VAULT: 00-SISTEMA/MEMORY_PROTOCOL.md → código e binários locais usados como verdade; pesquisa inconclusiva não registrada como ativo aprovado.
VAULT: 04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md → Vault consultado antes da pesquisa externa; regras aplicadas registradas.
VAULT: 04-DECISOES-GLOBAIS/DECISAO-SOBERANIA-DOS-DESIGN-TOKENS.md → linguagem visual e narrativa não alteradas.
VAULT: 01-PROJETOS/DialisaSUS/DECISOES.md → contexto do TCC consultado; branch segue instrução atual expressa, divergência registrada.
VAULT: 02-CONHECIMENTO/PROCESSOS/UI-LICENSE-CHECK.md → licença do atlas não extrapolada ao rim; aquisição interrompida sem cadeia completa.
VAULT: 02-CONHECIMENTO/3D-WEB/GLTF-TRANSFORM-OTIMIZACAO.md → nenhum processamento destrutivo executado; futura receita prioriza texturas e Meshopt.
VAULT: 02-CONHECIMENTO/3D-WEB/GLB-GLTF-NORMALIZACAO.md → Two-Group e escala uniforme registrados como pendências, sem alegar implementação.
