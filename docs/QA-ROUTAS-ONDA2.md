# QA empírico das rotas — fechamento das Ondas 2.4, 3 e 4

Data: 18/09/2026. Ambiente: checkout principal `C:\Users\Antonio\Desktop\dialisasus`, branch `remodelacao-v2`, build servido por HTTP local.

## Resultado

O build gera 34 páginas estáticas: home, assistente, quatro rotas de evidência nacionais, sobre a base, índice territorial e 27 fichas de UF. A inspeção visual foi feita nas capturas de 390 e 1440 px; o teste automatizado adicional cobriu todas as páginas nas duas larguras.

| Gate | Evidência | Resultado |
|---|---|---|
| Build estático | `npm run build` | 34 páginas geradas |
| Auditor canônico | `node tests/run_auditor_cli.mjs` | 72 PASS, 0 FAIL |
| Acessibilidade | axe-core nas sete rotas canônicas | 0 violações críticas, graves ou moderadas |
| Reflow canônico | 320, 375, 768, 1024 e 1440 px | `scrollWidth === innerWidth` em todas as medições |
| Matriz final | `node tests/qa_final.mjs` | 34 páginas × 2 viewports = 68 verificações; 0 overflow, 0 erro de `h1`, 0 erro de console |
| Interações | ano do mapa, ano da ficha SP, rim 3D e assistente | 4/4 passaram; URL dos seletores reproduzível |
| Cena do rim | rede observada no Playwright | `kidney.glb` ausente antes do clique e carregado depois; modo `interactive` |
| Rotas puras | auditor do build | 0 JavaScript de runtime em valor, contagem, modelo e sobre a base |
| Tokens | scanner CSS | 0 hex literal fora de `:root` |
| Dependências | `npm audit --omit=dev` | 0 vulnerabilidades |

O runner `tests/run_auditor_cli.mjs` foi corrigido para usar processo filho assíncrono: `spawnSync` dentro do callback do servidor bloqueava o event loop e produzia timeouts falsos no próprio HTTP local.

## Inspeção visual

Foram examinados o enquadramento, a legibilidade, a hierarquia, as tabelas gêmeas, o mapa, a sequência narrativa e os controles. A sequência da home recebeu correção específica de grid no mobile depois da primeira inspeção.

Capturas finais: `docs/evidencias/final/` contém 14 PNGs, uma dupla 390/1440 para início, valor, contagem, território, modelo, sobre a base e assistente. O relatório reexecutável está em `docs/evidencias/final/auditoria-final.json`.

## Segurança do assistente

- O servidor monta o contexto a partir do dossiê e ignora contexto numérico enviado pelo cliente.
- Perguntas clínicas são recusadas antes de qualquer chamada externa.
- O GET de saúde não expõe provedor, modelo ou modo.
- Falhas do provedor não devolvem mensagem, status interno ou modelo.
- O POST aceita JSON para a ilha e formulário HTML para uso sem JavaScript.
- A CSP e os demais cabeçalhos de segurança estão declarados em `netlify.toml`.

O texto `Gemini API error 503` exibido em `npm test` é produzido deliberadamente pelo teste de erro do provedor; o teste confirma que esse detalhe fica somente no log do servidor e não chega à resposta pública.

