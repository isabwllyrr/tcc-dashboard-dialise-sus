# Auditoria Forense da v1 em Produção (Baseline QA)

- **Data da Auditoria:** 2026-09-15
- **Papel Responsável:** Vistoria (QA Técnico & Homologação Forense)
- **Alvo Auditado:** https://dialisasus.netlify.app/web_dashboard/
- **Ambiente de Teste:** Google Chrome Headless 153.0.8010.36 via Playwright / CDP / Axe-core 4.10
- **Classificação de Evidência:** Todos os dados deste documento são **MEDIDOS** ou **OBSERVADOS** com ferramentas automatizadas e capturas de tela reais. Nenhuma estimativa "DECLARADO" foi admitida.

---

## 1. Sumário Executivo da v1

A versão v1 em produção apresenta sérios problemas estruturais de performance, acessibilidade e resiliência:
1. **Peso Excessivo na Rede:** Transferência de **2,735 MB** (2.800,4 KB comprimidos) por carga de página, sendo que um único asset PNG não otimizado (`renal-astra-lab.png`, 1,79 MB) responde por **63,9% de todo o tráfego**.
2. **Core Web Vitals em Faixa Crítica:** LCP de **4.576 ms** (zona vermelha > 4.000 ms), penalizado pelo carregamento bloqueante da splash screen e da imagem pesada.
3. **Resiliência Zero sem JavaScript:** Ausência total de tag `<noscript>`. Como o fechamento da tela de abertura depende de um `setTimeout` em JavaScript, desabilitar o script deixa a splash screen permanentemente congelada em tela cheia (`opacity: 1`, `display: grid`), impedindo qualquer acesso ao conteúdo.
4. **Violações Graves de Acessibilidade (WCAG AA):** Foram catalogados **44 nós com contraste insuficiente** entre texto e fundo (destaque para botões de ação `#3f72e8` com texto branco cuja razão é 4,39:1, abaixo do limite legal de 4,5:1), além de violações de `aria-prohibited-attr` e salto de hierarquia de cabeçalhos.
5. **Overflow Horizontal Real no Mobile:** Na aba Metodologia em 320px, a largura de rolagem atinge **379px**, gerando **+59px de estouro horizontal**, violando o critério WCAG 1.4.10 (Reflow).
6. **Desrespeito à Soberania dos Design Tokens:** Foram identificadas **324 ocorrências de cores hexadecimais literais** diretamente nas regras dos arquivos CSS, ignorando as variáveis do sistema.

---

## 2. Peso Total Transferido e Requisições de Rede

### 2.1 Métricas Gerais da Sessão
- **Total de Requisições HTTP:** 20
- **Peso Total Transferido (Encoded / Wire):** 2.800,4 KB (2,735 MB)
- **Recursos Descompactados no Cliente:** > 5,8 MB (com destaque para o GeoJSON com 3,46 MB)

### 2.2 Decomposição por Tipo de Recurso (MEDIDO via CDP Network)

| Categoria | Requisições | Peso Transferido (KB) | % do Peso Total | Principais Recursos / Impacto |
| :--- | :---: | :---: | :---: | :--- |
| **Imagens** | 1 | 1.790,4 KB | 63,93% | `assets/renal-astra-lab.png` (1,8 MB não comprimido/PNG sem WebP/AVIF) |
| **Fetches (Dados)** | 8 | 830,1 KB | 29,64% | `brazil-states.geojson` (~480 KB transferidos, 3,46 MB em disco), CSVs municipais e mensais |
| **Scripts (JS)** | 3 | 102,5 KB | 3,66% | `app.js` (103 KB), `config.js` e `lucide.min.js` (unpkg sem SRI) |
| **Fontes Web** | 3 | 54,1 KB | 1,93% | Woff2 do Google Fonts (IBM Plex Mono e Manrope) |
| **Estilos (CSS)** | 3 | 15,8 KB | 0,56% | `styles.css` (43 KB), `studio-theme.css` (27 KB), Google Fonts CSS |
| **Documento (HTML)**| 1 | 6,0 KB | 0,21% | `index.html` inicial |
| **Outros** | 1 | 1,6 KB | 0,06% | Favicon |
| **TOTAL** | **20** | **2.800,4 KB** | **100%** | **2,735 MB transferidos por carga limpa** |

---

## 3. Core Web Vitals (MEDIDO via PerformanceObserver)

Aferição realizada em Desktop 1440x900 sob carregamento direto da URL de produção:

| Indicador | Valor Medido | Meta Google CWV | Veredito | Causa Raiz Identificada |
| :--- | :---: | :---: | :---: | :--- |
| **LCP (Largest Contentful Paint)** | **4.576,0 ms** | < 2.500 ms | **POBRE (VERMELHO)** | Imagem `renal-astra-lab.png` dentro da splash screen e do cabeçalho |
| **FCP (First Contentful Paint)** | **4.576,0 ms** | < 1.800 ms | **POBRE (VERMELHO)** | Splash screen retém a primeira pintura com animação e bloqueio |
| **CLS (Cumulative Layout Shift)** | **0,0678** | < 0,1000 | **BOM (VERDE)** | Transição de fade-out da splash causa leve salto quando a sidebar e main se acomodam |
| **TTFB (Time to First Byte)** | **692,2 ms** | < 800 ms | **BOM (VERDE)** | Edge Netlify CDN com boa resposta para o HTML inicial |
| **DOMContentLoaded** | **4.281,1 ms** | - | - | Tempo total até processamento da árvore de scripts |
| **Load Event End** | **4.510,8 ms** | - | - | Conclusão do carregamento de todos os recursos de rede |

---

## 4. Auditoria de Acessibilidade (Axe Core por Aba/Seção)

Bateria de testes automatizados com `@axe-core/playwright` avaliando as diretrizes WCAG 2.1 AA em cada uma das abas e globalmente.

### 4.1 Resumo de Violações por Aba

| Aba / Seção | Regras Violadas | Severidade Dominante | Descrição das Falhas |
| :--- | :---: | :---: | :--- |
| **Visão Geral (`#overview`)** | 2 | Serious / Moderate | Falha de contraste em 3 botões/textos; salto na ordem de cabeçalhos (`heading-order`) |
| **Temporal (`#temporal`)** | 1 | Serious | Falha de contraste em 5 botões do segmented control e filtros |
| **Território (`#territory`)** | 1 | Serious | Falha de contraste em 29 nós na listagem de estados, rankings e botões de exportação |
| **Previsão (`#forecast`)** | 1 | Serious | Falha de contraste em 4 nós de controles e legendas |
| **Agente IA (`#agent`)** | 1 | Serious | Falha de contraste em 1 nó de placeholder/instrução |
| **Metodologia (`#methodology`)** | 1 | Serious | Falha de contraste em 2 nós do fluxo metodológico |
| **Triagem (`#risk`)** | 1 | Serious | `aria-prohibited-attr` no elemento `<div class="kidney-visual">` (uso de `aria-label` sem `role`) |
| **Global da Página** | 3 | Serious | `color-contrast`, `aria-prohibited-attr`, `heading-order` |

---

## 5. Nós Reprovados em Contraste de Cor (WCAG AA - 1.4.3)

Foram identificados **44 nós do DOM com contraste inferior ao mínimo de 4,5:1** para texto normal.

### 5.1 Principais Famílias de Falha de Contraste

1. **Botões de Ação Primária (`#3f72e8` com texto branco `#ffffff`):**
   - *Contraste Medido:* **4,39:1** (Exigido: 4,5:1)
   - *Impacto:* Presente no botão ativo de métricas da visão geral, botão "Tudo" da temporal, botão de exportar território e rótulos de botões de filtro.
   - *Solução para v2:* Escurecer o azul primário para ao menos `#3365d6` (atingindo > 4,6:1) ou `#2563eb` (5,1:1).

2. **Botões Inativos / Secundários (`#f1f4f9` com texto `#768298`):**
   - *Contraste Medido:* **3,51:1** (Exigido: 4,5:1)
   - *Impacto:* Todos os botões não selecionados dos controles segmentados nas abas Visão Geral e Temporal.
   - *Solução para v2:* Substituir `#768298` por um cinza neutro escuro (mínimo `#525d70`, taxa 5,2:1).

3. **Micro-rótulos e Eyebrows (`#3f72e8` sobre `#f8fbff`):**
   - *Contraste Medido:* **4,22:1** (Exigido: 4,5:1 para fontes menores que 14pt negrito)
   - *Impacto:* Presente em subtítulos de seções como `<p class="eyebrow">Mapa nacional</p>` (tamanho de fonte 9px / 6.8pt).

---

## 6. Medição de Overflow Horizontal nos Viewports Canônicos

Medição executada através do teste `document.documentElement.scrollWidth === window.innerWidth`.

| Viewport Testado | Dispositivo / Perfil | `innerWidth` | `scrollWidth` | Delta (Overflow) | Veredito |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **320px** (Home) | iPhone SE 1ª geração / Compacto | 320px | 320px | 0px | **PASS** (na Home) |
| **320px** (Metodologia)| Telas mínimas móveis | 320px | 379px | **+59px** | **FAIL CRÍTICO** |
| **375px** (Home) | Mobile padrão de mercado | 375px | 375px | 0px | **PASS** (na Home) |
| **375px** (Metodologia)| Mobile padrão de mercado | 375px | 379px | **+4px** | **FAIL** |
| **768px** | Tablet Portrait | 768px | 768px | 0px | **PASS** |
| **1024px** | Tablet Landscape / Ultrabook | 1024px | 1024px | 0px | **PASS** |
| **1440px** | Desktop Padrão | 1440px | 1440px | 0px | **PASS** |

### 6.1 Análise do Estouro de 379px em Mobile
Ao navegar para a aba `#methodology`, os containers `.steps-list` e `.method-flow` impõem larguras mínimas em seus passos e itens de fluxo que extrapolam a largura da tela. Além disso, o elemento `#introSplash` possui largura interna de `390px` com `rRight = 392px`, o que em determinadas combinações de renderização quebra o grid em resoluções ultra-compactas.

---

## 7. Comportamento de Resiliência: JavaScript Desabilitado

Foi instanciada uma sessão de navegação isolada com `javaScriptEnabled: false` para atestar a conformidade com as diretrizes do AI-Vault (`[[SEO-JAVASCRIPT-E-HTML-INICIAL]]` e `[[CHECKLIST-SITE-ALTO-PADRAO]]`).

### 7.1 Diagnóstico de Resiliência

| Propriedade / Elemento | Estado Observado sem JS | Consequência no Navegador |
| :--- | :---: | :--- |
| **Tag `<noscript>`** | **AUSENTE** | O usuário não recebe nenhuma explicação ou instrução de fallback. |
| **Splash Screen (`#introSplash`)** | `display: grid`, `opacity: 1`, `visibility: visible` | **Bloqueio Total:** A tela de abertura fica permanentemente fixa cobrindo 100% da viewport. |
| **Remoção da Splash (`app.js`)** | Não executada | O `window.setTimeout` de 1.800 ms nunca roda, mantendo a classe `.splash-hidden` desativada. |
| **Cards Executivos (KPIs)** | 0 renderizados | O container `#executiveStrip` permanece como uma `<div>` vazia. |
| **Gráficos e Mapas** | 9 tags `<canvas>` vazias | Todo o desenho analítico depende do motor Canvas 2D via JavaScript. |
| **Veredito Geral** | **INOPERANTE (0% de resiliência)** | Tela travada em branco/azul com a imagem do rim estática e a frase "Sincronizando indicadores". |

---

## 8. Verificação de SEO Estruturado e Design Tokens

Varredura executada via `tools/auditar-rotas.mjs`:
- **Hierarquia de `<h1>`:** **REPROVADO**. A v1 possui dois `<h1>` simultâneos no DOM: `<h1>DialisaSUS</h1>` (no splash) e `<h1>Diálise no SUS, em uma única visão.</h1>` (na barra superior).
- **Tag Canonical:** **REPROVADO**. `<link rel="canonical">` inexistente no `<head>`.
- **JSON-LD Semântico:** **REPROVADO**. Nenhum bloco de dados estruturados Schema.org (`Dataset`, `MedicalWebPage` ou `WebApplication`) implementado.
- **Soberania dos Design Tokens (CSS):** **REPROVADO**. Foram catalogadas **324 ocorrências de cores hexadecimais literais** fora de `:root` (170 em `styles.css` e 154 em `studio-theme.css`).

---

## 9. Registro de Evidências Fotográficas e Arquivos

Todos os arquivos comprobatórios gerados durante a auditoria estão salvos localmente em `docs/evidencias/baseline-v1/`:

1. **Tela de Abertura (Splash):** `docs/evidencias/baseline-v1/01-splash-screen.png`
2. **Visão Geral Desktop (1440px):** `docs/evidencias/baseline-v1/02-overview-desktop-1440px.png`
3. **Resiliência sem JS (Travamento):** `docs/evidencias/baseline-v1/03-no-javascript-resilience.png`
4. **Overflow na Metodologia (320px):** `docs/evidencias/baseline-v1/overflow-methodology-320px.png`
5. **Viewports Canônicos:**
   - 320px: `docs/evidencias/baseline-v1/viewport-320px.png`
   - 375px: `docs/evidencias/baseline-v1/viewport-375px.png`
   - 768px: `docs/evidencias/baseline-v1/viewport-768px.png`
   - 1440px: `docs/evidencias/baseline-v1/viewport-1440px.png`
6. **Capturas por Aba:**
   - Overview: `docs/evidencias/baseline-v1/tab-overview-1440px.png`
   - Temporal: `docs/evidencias/baseline-v1/tab-temporal-1440px.png`
   - Território: `docs/evidencias/baseline-v1/tab-territory-1440px.png`
   - Previsão: `docs/evidencias/baseline-v1/tab-forecast-1440px.png`
   - Agente IA: `docs/evidencias/baseline-v1/tab-agent-1440px.png`
   - Metodologia: `docs/evidencias/baseline-v1/tab-methodology-1440px.png`
   - Triagem: `docs/evidencias/baseline-v1/tab-risk-1440px.png`
7. **Dataset Bruto JSON da Auditoria:** `docs/evidencias/baseline-v1/audit-raw.json`
