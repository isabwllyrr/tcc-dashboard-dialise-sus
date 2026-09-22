# Sistema de Design e Especificação Visual — DialisaSUS v2

**Responsável:** Retícula (Direção Criativa e UX)  
**Data:** 2026-09-15  
**Base no AI-Vault:** `DECISAO-SOBERANIA-DOS-DESIGN-TOKENS.md`, `PROCESSO-SITES-ALTO-PADRAO-COM-IA.md`, `PROCESSO-REFERENCIAS-DESIGNMD.md`, `PADRAO-DATAVIZ-ACESSIVEL.md`.  
**Tokens canônicos:** `tokens.json`

---

## 1. Princípios e Regra Soberana

1. **Referência Soberana da Autora:**  
   *"Como as visualizações que ficam disponíveis nos sites do governo."*  
   O produto é um instrumento público de saúde, de leitura sóbria, denso e acessível a gestores e pesquisadores. Ele **não** busca impressionar com pirotecnia visual ou efeitos que atrapalhem o dado.
2. **Honestidade do Dado sobre o Efeito:**  
   Nenhum efeito visual de Nível 1 (tipografia cinética, scroll narrativo) é permitido nos instrumentos interativos (`/explorar/`, `/previsao/`). O efeito pertence exclusivamente aos capítulos do relatório narrativo (`/`), onde apoia a compreensão da passagem do tempo.
3. **Proibições Estritas (Veto Formal do Vault):**
   - **Sem micro-rótulos mono sem validação:** Rejeitados pelo usuário após a auditoria da AURA.
   - **Sem gradiente em barras:** Barras de gráficos são sempre sólidas, com início obrigatoriamente na base zero.
   - **Sem cards de KPI de mesmo peso:** A hierarquia exige um Número-Herói destacado e métricas subordinadas proporcionais.
   - **Sem splash screen:** Acesso imediato ao documento no primeiro frame de renderização.
   - **Sem falso vermelho:** O vermelho é reservado para falhas e quebras metodológicas graves, nunca para crescimento observável do SUS.

---

## 2. As Duas Direções Visuais Contrastantes

Para submissão ao Gate Humano G2 (escolha do usuário), foram desenhadas duas pranchas funcionais com dados reais extraídos de `docs/RECONCILIACAO-V1-V2.xlsx`:

### Prancha A — "Boletim Técnico" (Recomendada)
- **Metáfora visual:** Publicação oficial e caderno técnico de estatística pública (estilo IPEA / IBGE / DATASUS modernizado).
- **Paleta:** Fundo papel quente (`#F8F9FA`), cartões brancos com fios finos de 1px (`#D0D7DE`), texto ardósia de altíssimo contraste (`#0F172A`).
- **Acentos:** Verde institucional de saúde pública (`#0B5D51`) e azul cívico (`#005CA9`).
- **Tipografia:** Sans-serif técnica para dados e navegação; itálico serifado elegante apenas na palavra-chave do título principal (*"Uma década de diálise"*).
- **Componentes-chave do acervo:** `Grade-Instrumentada`, `Rodapé-Documento`, `Axis-Cursor`.

### Prancha B — "Laboratório"
- **Metáfora visual:** Console analítico de instrumentação médica de alta precisão.
- **Paleta:** Fundo ardósia escuro (`#0A0E17`), cartões escuros em camadas (`#111827`), bordas técnicas refinadas (`#374151`).
- **Acentos:** Ciano cirúrgico e esmeralda analítico para realce focal de leitura em telas noturnas.
- **Tipografia:** Sans-serif pura e geométrica em toda a interface, com hierarquia baseada em tamanho e peso semântico.
- **Componentes-chave do acervo:** `Barra-de-Specs-Count-Up`, `Fila-de-Indicadores`, `Compare-Slider`.

---

## 3. Tipografia e Escalas

A tipografia prioriza precisão de leitura numérica e alinhamento tabular:

```css
:root {
  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-serif: Georgia, 'Times New Roman', Cambria, serif;
  --font-mono: ui-monospace, SFMono-Regular, 'Cascadia Code', Consolas, monospace;

  /* Escala de tamanhos */
  --text-hero: 3rem;       /* 48px - Número macro */
  --text-h1: 2.25rem;      /* 36px - Título de capítulo */
  --text-h2: 1.75rem;      /* 28px - Subseção */
  --text-h3: 1.25rem;      /* 20px - Cabeçalho de card/gráfico */
  --text-body: 1rem;       /* 16px - Leitura regular */
  --text-small: 0.875rem;  /* 14px - Tabelas e metadados */
  --text-caption: 0.75rem; /* 12px - Legendas figcaption */
}
```

---

## 4. Sistema de Espaçamento e Grid

- **Unidade modular básica:** 4px / 8px.
- **Escala de espaçamentos:**
  - `4px` (`--space-1`): Respiros internos mínimos e espaçamento de ícones.
  - `8px` (`--space-2`): Distância entre rótulo e valor.
  - `16px` (`--space-4`): Padding padrão de cartões e células.
  - `24px` (`--space-6`): Gutter da grade e espaçamento entre componentes.
  - `48px` (`--space-12`): Distância entre blocos de conteúdo.
  - `64px` (`--space-16`): Separação vertical entre capítulos do relatório.
- **Breakpoints Responsivos:**
  - Mobile: `375px` (layout fluido em coluna única, tabelas com scroll horizontal controlado).
  - Tablet: `768px` (layout em duas colunas funcionais).
  - Desktop: `1440px` (container centralizado com max-width `1280px` e largura de leitura otimizada em `780px`).

---

## 5. Tokens de Visualização de Dados (`PENDENTE-ESCALA`)

Conforme a regra soberana do projeto, os tokens de cores aplicados em gráficos e mapas **não são arbitrados pela Direção Criativa**. Eles estão registrados com o estado **`PENDENTE-ESCALA`** e aguardam a validação matemática da especialista Escala através do script `tools/validate_palette.js`:

| Token de Dados | Função Semântica | Estado de Governança | Validação Obrigatória |
|---|---|---|---|
| `--data-observed` | Linha e barras de dados históricos mensurados no SIA | `PENDENTE-ESCALA` | Escala (`tools/validate_palette.js`) |
| `--data-estimate` | Traço tracejado de previsão preditiva | `PENDENTE-ESCALA` | Escala (`tools/validate_palette.js`) |
| `--data-band` | Faixa empírica de 95% de incerteza | `PENDENTE-ESCALA` | Escala (`tools/validate_palette.js`) |
| `--data-seq-1` a `7` | Classes da rampa sequencial monotom do mapa | `PENDENTE-ESCALA` | Escala (`tools/validate_palette.js`) |
| `--status-provisional` | Padrão hachurado para competências mai–jun/2026 | `PENDENTE-ESCALA` | Escala (`tools/validate_palette.js`) |
| `--status-observed` | Distintivo de dado consolidado | `PENDENTE-ESCALA` | Escala (`tools/validate_palette.js`) |
| `--status-estimated` | Distintivo de projeção com margem de erro | `PENDENTE-ESCALA` | Escala (`tools/validate_palette.js`) |

---

## 6. Inventário de Estados de Componentes Obrigatórios

Cada componente do sistema (cartão, tabela, gráfico, seletor) deve implementar formalmente 6 estados:
1. **Padrão (Default):** Renderização limpa com o dado carregado.
2. **Carregando (Loading):** Esqueleto estrutural com a mesma geometria do dado final, sem deslocamento de layout (CLS zero).
3. **Vazio (Empty):** Mensagem contextual explicando por que não há dados para o recorte e como ajustar o filtro.
4. **Erro (Error):** Alerta explicativo em linguagem civil, sem expor mensagens de pilha ou rastreamento de servidor.
5. **Parcial / Provisório:** Hachura diagonal sutil e etiqueta com aviso de competência com processamento em aberto.
6. **Estimado:** Traço pontilhado ou faixa semitransparente com indicação do intervalo de confiança.
