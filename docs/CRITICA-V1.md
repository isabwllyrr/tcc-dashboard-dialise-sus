# Crítica de design da v1 — DialisaSUS

**Data:** 2026-09-15 · **Método:** skill `design:design-critique` sobre os 7 prints da versão no ar (`app.js?v=20260915-ibge-ipca`), cruzada com o código e com os anti-padrões do AI-Vault.
**Estágio avaliado:** produto publicado, em vias de ser substituído. A crítica serve para decidir o que a v2 **não** repete e o que ela **preserva**.
**Telas:** Visão geral · Temporal · Território · Previsão · Agente IA · Metodologia · Triagem.

---

## Impressão geral

A v1 é competente na superfície e frágil na hierarquia: tudo é bonito, quase nada é mais importante que outra coisa. O produto sabe apresentar números, mas não diz qual deles responde à pergunta do trabalho — e por isso o leitor sai sabendo quanto se gastou, sem saber o que isso significa.

A maior oportunidade não é estética, é editorial. E existe uma tela que já faz certo o que todas as outras erram: **a Previsão separa fato de estimativa com forma, cor e texto**. Esse é o padrão a estender, não a abandonar.

---

## Usabilidade

| Achado | Severidade | Recomendação |
|---|---|---|
| **A triagem mostra "Baixo" sem que ninguém tenha digitado nada.** Os campos abrem preenchidos (45 / 90 / 10) e o painel já exibe uma classificação KDIGO. Quem chega e sai lê um resultado clínico que não é seu. | 🔴 Crítico | Estado inicial vazio e explícito: "Informe TFG e albuminúria para ver a categoria". O resultado só aparece após entrada deliberada. |
| **Cards escuros sem valor na aba Território** ("Participação no valor", "Participação na quantidade", "Custo médio"): a caixa é renderizada com rótulo e sem número. Um estado vazio publicado com aparência de dado. | 🔴 Crítico | Ou preencher, ou não renderizar. Estado vazio precisa dizer o que é, por que está vazio e como sair dele. |
| **O filtro de período vive na aba Temporal e altera KPIs de outras abas** sem aviso. O usuário mexe num controle numa tela e outra tela mente depois. | 🔴 Crítico | Estado de filtro único, visível na própria tela onde age e refletido na URL. |
| **O campo "Idade" é coletado e nunca usado** no cálculo da triagem. | 🟡 Moderado | Remover, ou declarar que é contexto e não entra na categoria — como já se fez com os 12 fatores. |
| **A evidência mais forte está atrás de disclosure**: "Detalhes técnicos" (Previsão) e "Modelos testados" (Metodologia) abrem colapsados. O erro por horizonte e a comparação entre modelos são a parte honesta do trabalho. | 🟡 Moderado | Abertos por padrão numa página cuja função é justificar o método. Colapsa-se o supérfluo, nunca a prova. |
| **As perguntas sugeridas do agente são rótulos de assunto**, não perguntas: "Leitura geral", "Previsão", "Modelo e MAPE". Clica-se sem saber o que será perguntado. | 🟡 Moderado | Escrever a pergunta inteira no botão: "Quais municípios cresceram mais depois da pandemia?" |
| **Os avisos de escopo do agente ficam num painel lateral**, longe do campo onde a pessoa digita. | 🟡 Moderado | Frase curta no ponto de uso, abaixo do campo. |
| **Nomes truncados no ranking** ("RIO DE JANEIRO …", "BELO HORIZONT…") num bloco cuja informação principal é o nome. | 🟢 Menor | Encurtar a barra, não o rótulo. O nome é o dado. |
| **Os alvos de toque dos 12 checkboxes** aparentam ficar abaixo de 24 px. | 🟢 Menor | Mínimo 24 px, 44 px no mobile (WCAG 2.5.8). |

---

## Hierarquia visual

- **O que o olho pega primeiro:** os quatro cards de KPI, de peso idêntico. **Está errado.** Quatro números com a mesma tipografia, a mesma caixa e o mesmo destaque comunicam que os quatro importam igualmente — e não importam. O trabalho responde a uma pergunta sobre evolução e território; "custo médio" e "variação em 2025" não são pares de "valor total no período". É `ANTI-PADRAO-IA-INVENTA-UI-SEM-PESQUISA` na forma mais literal.
- **Ênfase invertida no gráfico principal:** na Visão geral, a **média móvel de 12 meses** é a linha grossa e saturada; a **série mensal observada** é um traço pálido e fino ao fundo. O dado derivado domina o dado medido. O leitor acredita estar vendo a série e está vendo a suavização.
- **Fluxo de leitura quebrado por duplicação:** "Valor anual" e "Participação por grupo" aparecem idênticos na Visão geral e na Temporal. Duas seções disputando a mesma função é defeito de arquitetura, não de estilo.
- **Território concentra o produto inteiro** — mapa, quatro cards, quatro cards escuros, comparação por região, dois Top 15, crescimento pós-pandemia e tabela de 25 linhas — enquanto a Visão geral repete pedaços dele. A aba que deveria ser um instrumento virou um segundo site.
- **Peso no lugar errado na triagem:** a imagem do rim ocupa o topo do painel de resultado e a classificação vem depois. Os 12 fatores decorativos têm o mesmo peso visual dos dois campos que efetivamente decidem a categoria.
- **Onde a hierarquia funciona:** o card "MODELO ATIVO" na Previsão é o único elemento do sistema com peso deliberadamente maior que os vizinhos. E funciona. É a prova de que o problema não é falta de capacidade visual, é falta de decisão editorial.

---

## Consistência

| Elemento | Problema | Recomendação |
|---|---|---|
| **Paleta dos rankings** | Território usa verde→azul no "Top 15 por valor" e vermelho→amarelo no "Top 15 por quantidade". **Os mesmos municípios, duas paletas.** A cor deixa de identificar a entidade e passa a identificar o bloco. | Cor segue a entidade. Métrica se troca por eixo e rótulo, nunca por repintura. |
| **Gradientes decorativos** | Barras anuais em gradiente; comparação por período com **um gradiente diferente por linha** (teal→azul, laranja→azul, vermelho→azul). Três rampas distintas sem nenhuma diferença de significado entre as três linhas. | Barra chapada. Gradiente em barra está vetado nas duas direções visuais do plano. |
| **Escala do mapa** | A rampa vai de azul claro a **verde** no extremo. Duas matizes num coroplético que se apresenta como sequencial: SP "salta" por mudança de matiz, não por intensidade. | Sequencial de um matiz, no máximo 7 classes, legenda com as quebras. |
| **Formato de número** | "R$ 40,03 bi" e "R$ 8.424.915.552" na mesma tela. | Uma regra só, escrita no glossário: abreviado na leitura, integral na tabela. |
| **Marcas de eixo não-redondas** | Os eixos Y trazem 159,73 mi · 234,78 mi · 309,82 mi · 384,87 mi · 459,92 mi — valores derivados do mínimo e do máximo da série. Ninguém lê um gráfico em passos de 75,05 milhões. | Ticks redondos, com o domínio arredondado antes de construir a escala. |
| **Barras de crescimento sem base honesta** | Em "Maiores crescimentos pós-pandemia", 235,97% e 85,91% têm comprimento visualmente próximo. A escala não parte de zero ou está comprimida. | Barra sempre a partir do zero. É comparação de comprimento; se a base mente, a leitura mente. |
| **Micro-rótulos mono em caixa alta** | "MONITORAMENTO NACIONAL", "SÉRIE MENSAL NACIONAL", "COMPOSIÇÃO", "CONCENTRAÇÃO", "INTENSIDADE 100,00%". Alguns são vazios de conteúdo. | O Vault registra que o usuário já rejeitou micro-rótulos mono não validados. Fora das duas pranchas. |
| **Semântica de cor** | "+3,93%" em vermelho. Vermelho é alarme; o crescimento é o achado central do trabalho, não um erro. Na Previsão, a projeção também é vermelha. | Reservar vermelho para alerta real. Projeção é cor de acento com tracejado, nunca cor de risco. |
| **Bloco de grupos sem informação** | Três barras onde uma vale 98,60%. O gráfico não distingue nada. | Frase e tabela. Uma barra de 98,6% contra duas invisíveis é espaço gasto para dizer "é quase tudo clínico". |
| **Selo do fornecedor na interface** | "GEMINI ONLINE" como badge de status, e "IA + DATASUS" como selo. | Produto acadêmico não anuncia fornecedor. O modelo também não deve ser exposto pelo endpoint — ver `CONTEXTO.md`. |

---

## Acessibilidade

Avaliação preliminar sobre os prints e o código. A auditoria formal com axe e NVDA é a etapa 6.

- **Conteúdo inteiramente dependente de JS.** Todos os números vivem em canvas desenhado à mão e em DOM montado por `app.js`. Sem JavaScript a página é vazia; com leitor de tela, os gráficos não existem. **É o defeito mais grave de acessibilidade do produto** e a razão de a v2 exigir `figure` + `figcaption` + tabela equivalente.
- **1.4.1, informação só por cor.** Mapa, composição por grupo e distinção observado × estimado dependem de cor. Na Previsão o tracejado já resolve — é o único lugar que acerta.
- **1.4.11, contraste de elementos gráficos.** Os tons claros do mapa (UFs do Norte) contra o fundo branco do card ficam visivelmente abaixo de 3:1; as bordas de UF idem.
- **Mapa sem teclado.** SVG sem foco e sem alternativa. Na v2 a seleção primária passa a ser `<select>` mais tabela, com o mapa como realce.
- **Tooltip como único acesso ao valor.** Só mouse, sem equivalente por teclado ou toque.
- **Splash de abertura** sem função além de decorar: atrasa o conteúdo e não tem controle de dispensa.
- **Já correto:** `lang="pt-BR"` está declarado, o corpo de texto tem tamanho e entrelinha confortáveis, e o texto escuro sobre fundo claro passa com folga.

---

## O que funciona bem

1. **A Previsão trata fato e estimativa como coisas diferentes** — linha sólida contra tracejada, cores distintas, banda de incerteza e um divisor rotulado "INÍCIO DA PREVISÃO". É o padrão que a v2 deve generalizar para o resto do produto.
2. **O card "MODELO ATIVO" prova que a hierarquia é possível** neste sistema visual: um elemento com peso maior, e o olho vai nele.
3. **Os avisos de escopo existem.** A faixa da triagem e o painel do agente dizem o que o produto não faz. Falta aproximá-los do ponto de uso, não criá-los.
4. **A frase "Eles são contexto clínico e não compõem uma pontuação inventada"** é honestidade rara num produto de saúde. Preservar o espírito e melhorar a forma.
5. **Mapa com painel de resumo sincronizado** no Território é um bom padrão de instrumento. O problema é o que está em volta, não ele.
6. **Navegação estável e linguagem de card coerente** em todas as telas. A base de consistência existe; falta subordiná-la a uma hierarquia.

---

## Recomendações por prioridade

1. **Trocar "painel" por "resposta".** A abertura não deve ser a soma das outras abas: ela responde à pergunta norteadora em três números e conduz por capítulos até os limites. Cada instrumento vira uma página com função única e **nenhum gráfico aparece duas vezes**. Isso resolve de uma vez a duplicação, a inflação do Território e a ausência de hierarquia — os três achados mais caros desta crítica.
2. **Corrigir a semântica do dado antes da estética.** Ênfase no observado e não na média móvel; barras a partir do zero; ticks redondos; uma paleta por entidade; sequencial de um matiz no mapa; vermelho só para alerta. Nada disso é gosto: cada item muda o que o leitor conclui.
3. **Tornar o conteúdo legível sem JavaScript.** Cada gráfico como `figure` com legenda que carrega o número, e tabela equivalente no HTML inicial. Resolve acessibilidade, SEO e a auditabilidade que uma banca vai cobrar, de uma vez.
4. **Fazer a Metodologia carregar a transparência.** Hoje são quatro cards e cinco pílulas. Precisa trazer os códigos SIGTAP do recorte, a data de extração, as versões, as limitações declaradas, autoria, orientação, instituição e forma de citação — incluindo as ressalvas de escopo abertas em `CONTEXTO.md`.
5. **Reconstruir a triagem em torno da matriz G×A.** Estado inicial vazio, os dois campos decisivos com peso próprio, a matriz visível com o texto da categoria em cada célula, os fatores rebaixados a contexto declarado e a imagem do rim fora do caminho da informação.

---

## VAULT
- `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-IA-INVENTA-UI-SEM-PESQUISA.md` → fim dos quatro cards de KPI de peso igual
- `02-CONHECIMENTO/PADROES/PADRAO-ARQUITETURA-LANDING-PAGE.md` → duas seções não disputam a mesma função; a duplicação entre Visão geral e Temporal é defeito de arquitetura
- `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-DIRECAO-VISUAL-SEM-REFERENCIA-DO-USUARIO.md` → micro-rótulos mono e gradiente em barra ficam fora das duas pranchas
- `02-CONHECIMENTO/SEO/SEO-3D-WEBGL-DUAL-LAYER.md` → o dado nunca fica só no canvas; figure, figcaption e tabela
- `02-CONHECIMENTO/AGENT-WEB/CONTEXTO-E-CONFIABILIDADE-DA-DECISAO.md` → fato e estimativa separados; a Previsão já é o padrão a estender
- `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-PRELOADER-FOR-SHOW.md` → o splash sem função sai
- `02-CONHECIMENTO/SEO/CONTEUDO-AUTORIDADE-E-EEAT.md` → autoria, orientação e instituição visíveis na Metodologia
- `01-PROJETOS/DialisaSUS/CONTEXTO.md` → achados de código cruzados com os prints (estado de filtro, provedor exposto, resíduo dos pesos na triagem)
- Fonte externa declarada (lacuna do Vault em dataviz): skills `dataviz` e `design:design-critique`
