# Guia da autora — DialisaSUS

Este arquivo é para você que vai apresentar o trabalho. Ele explica **como mexer em cada aba**, o que pode mudar à vontade, o que é melhor não mexer, e **por quê** — porque na banca você vai precisar defender as escolhas, não só mostrá-las.

O sistema é seu. Muda tudo que quiser. O que está aqui é para te poupar tempo e evitar armadilhas que já custaram retrabalho.

---

## 1. Como rodar na sua máquina

Precisa de **Node.js 20 ou mais novo** e **Python 3.10 ou mais novo**.

```bash
git clone <url-do-repositorio>
cd dialisasus

npm install                       # dependências do site
pip install -r requirements.txt   # dependências da análise

npm run dev                       # abre em http://localhost:4321
```

O `npm run dev` recarrega sozinho quando você salva um arquivo. É nele que você trabalha.

Quando quiser gerar a versão final:

```bash
npm run build     # gera a pasta dist/ com o site pronto
npm run preview   # serve o dist/ para conferir antes de publicar
```

### Se você mexer nos dados

O site **não lê os CSV direto**. Ele lê a pasta `dossie/`, que é gerada pelo pipeline. Se você reprocessar os dados, precisa regerar o dossiê:

```bash
python scripts/tratamento_mensal_dialise.py
python scripts/analise_exploratoria.py
python scripts/tratamento_municipio_dialise.py
python scripts/integrar_ibge.py
python scripts/modelagem_preditiva.py
python scripts/agregacao_territorial.py
python scripts/gerar_dossie.py

python scripts/validar_dados.py   # confere se ficou tudo coerente
```

**A ordem importa** — cada passo consome a saída do anterior.

---

## 2. Quero mudar X, abro qual arquivo?

| O que você quer mudar | Arquivo |
|---|---|
| Texto, títulos e ordem da **página inicial** | `src/pages/index.astro` |
| Aba **Valor** | `src/pages/evidencias/valor/index.astro` |
| Aba **Território** | `src/pages/evidencias/territorio/index.astro` |
| Página de **uma UF** (as 27 são geradas por este arquivo) | `src/pages/evidencias/territorio/[uf].astro` |
| Aba **Contagem** | `src/pages/evidencias/contagem/index.astro` |
| Aba **Modelo** | `src/pages/evidencias/modelo/index.astro` |
| Aba **Sobre a base** | `src/pages/sobre-a-base/index.astro` |
| Aba **Assistente** | `src/pages/assistente/index.astro` |
| **Menu de navegação**, cabeçalho e rodapé (aparecem em todas as páginas) | `src/layouts/BaseLayout.astro` |
| **Cores, fontes, espaçamentos** — o visual inteiro | `public/assets/style.css` |
| **Componente de gráfico de linha** | `src/components/LineChart.astro` |
| **Rim 3D** | `public/assets/kidney.js` e `scripts/gerar_rim.mjs` |
| **Números** que aparecem na tela | não se mexe aqui — ver a seção 4 |

Para **criar uma aba nova**: crie uma pasta em `src/pages/` com um `index.astro` dentro. Uma pasta chamada `metodologia` vira a rota `/metodologia/`. Depois acrescente o link no `BaseLayout.astro`.

---

## 3. As cinco regras que protegem o trabalho

Estas não são preferência de design. Cada uma existe porque o contrário já deu problema, e todas são atacáveis numa banca se forem quebradas.

### 3.1 Procedimentos aprovados, nunca pacientes

A base conta **procedimentos**, não pessoas. Uma pessoa em hemodiálise faz várias sessões por mês, e o recorte ainda inclui coisas que **não são sessões**: acesso vascular, materiais, acompanhamento pré-dialítico.

Por isso:

- 187,95 milhões de procedimentos **não** são 187,95 milhões de pessoas
- **não** se divide esse total por 12 ou 13 para "achar pacientes"
- **não** se mistura o Censo da SBN, que conta pacientes, com o SIA, que conta procedimentos

Toda aba traz a frase *"Esta base conta procedimentos aprovados, não pessoas"* antes do primeiro gráfico. Se você criar uma aba nova, repita essa frase. É a ressalva mais importante do trabalho — se alguém sair da apresentação achando que são pessoas, o produto falhou.

### 3.2 Por local de atendimento, não de residência

O TabNet informa onde o procedimento **foi realizado**, não onde a pessoa mora. Está escrito na primeira linha de toda extração.

Consequência prática: um município polo tem taxa por habitante altíssima porque atende gente da região inteira. **Taxa alta não é prevalência, não é demanda, não é doença.** É produção aprovada naquele endereço.

### 3.3 Ausência de registro não é zero

Esta é a mais sutil, e foi um erro real que existia no projeto.

O TabNet usa o traço `-` para dizer "não houve registro". O código antigo convertia isso em `0`. Depois disso, "não houve registro" e "houve zero" viravam a mesma coisa — e qualquer variação percentual calculada em cima **inventava uma queda de 100% que ninguém mediu**.

Provas de que zero não é fechamento de serviço:

- **Parnamirim (RN)** fica sem registro de 2023 a 2025 e volta com 1.816 procedimentos em 2026
- **Mauá (SP)** fica sem registro de 2016 a 2023 e registra 12.955 em 2025

O buraco é intermitente, não terminal. Hoje o pipeline guarda **cinco estados** para cada número:

| Estado | Significa |
|---|---|
| `observado` | medido e consolidado |
| `provisorio` | medido, mas ainda vai mudar na próxima extração |
| `estimado` | saída de modelo ou interpolação |
| `sem_registro` | o TabNet não trouxe registro — **não é zero** |
| `ausente` | o período não existe nesta extração |

Na tela, `sem_registro` se escreve **"sem registro no recorte"**. Nunca "zero", "fechou" ou "sem serviço".

### 3.4 Nominal e real, sempre juntos

O valor aprovado subiu **+88,61%** entre 2015 e 2025. Corrigido pela inflação, subiu **+11,34%**. O valor por procedimento subiu **+22,28%** nominal e **caiu 13,74%** real.

A leitura nominal sozinha não está errada — está **incompleta a ponto de inverter a conclusão**. Por isso os dois aparecem no mesmo gráfico, no mesmo eixo, com o real em destaque. A distância entre as duas linhas *é* a inflação, e é o achado.

Se você criar um gráfico de dinheiro ao longo do tempo, mostre os dois.

### 3.5 Duas comparações com períodos diferentes não se somam

- `2015 → 2025` é uma comparação
- `pré-pandemia (2015–2019) → pós-pandemia (2022–2025)` é outra

Elas medem coisas diferentes, em janelas diferentes. **Não some +23,71% com −13,74%.** O texto do site deixa isso explícito de propósito, e vale manter na apresentação.

---

## 4. De onde vêm os números da tela

**Nenhum número é digitado no código.** Todos saem da pasta `dossie/`, que é gerada pelo pipeline a partir dos CSV.

Na prática, dentro de um arquivo `.astro`, é assim:

```astro
---
import { ptNumber, readDossie } from "../../../lib/dossie";
const nacional = readDossie("nacional.json");
const variacao = nacional.achados
  .find((a) => a.id === "G1.achado.variacao_real").valores[0].valor;
---
<p>A variação real foi de {ptNumber(variacao, 2)}%.</p>
```

**Por que não digitar direto?** Porque se você reprocessar os dados e o número mudar, o texto muda junto. Número digitado à mão vira mentira silenciosa no dia em que a base for atualizada — e ninguém percebe até a banca perguntar.

### Funções de formatação disponíveis

Estão em `src/lib/dossie.ts` e já cuidam do padrão brasileiro:

| Função | Para quê | Exemplo de saída |
|---|---|---|
| `ptInt(n)` | inteiro | `187.951.964` |
| `ptNumber(n, casas)` | decimal | `11,34` |
| `ptPercent(n, casas)` | percentual com sinal | `+11,3%` |
| `ptMoney(n)` | dinheiro | `R$ 4.948.321.232` |
| `labelModel(s)` | nome do modelo | `Holt–Winters` |

### O que tem dentro do dossiê

| Arquivo | Conteúdo |
|---|---|
| `dossie/nacional.json` | séries anuais e mensais nacionais, achados de G1, G2 e G3 |
| `dossie/modelo.json` | backtest, comparação de modelos, previsão |
| `dossie/territorio/indice.json` | as 27 UFs com taxa, quantidade e população |
| `dossie/territorio/uf-XX.json` | uma por UF, com os municípios |
| `dossie/territorio/distribuicao.json` | trajetórias municipais |
| `dossie/glossario.json` | definições dos termos |
| `dossie/ressalvas.json` | textos canônicos das ressalvas |
| `dossie/manifesto.json` | data de extração, versão, cobertura |

Cada número no dossiê carrega tipo, unidade, **estado**, origem (qual CSV, qual coluna, qual script) e, quando é taxa, a procedência do denominador. É isso que permite rastrear qualquer valor da tela até o dado bruto — e é a resposta pronta se a banca perguntar "de onde saiu esse número?".

Depois de mexer, confira:

```bash
npm run check:dossie
```

---

## 5. Como mudar textos

Textos ficam direto no `.astro`, em HTML normal. Procure a frase que quer trocar e edite.

As classes que já existem e você pode reaproveitar:

| Classe | Papel |
|---|---|
| `claim` | a afirmação principal da página, em corpo grande |
| `standfirst` | parágrafo de apoio logo abaixo do título |
| `chapter` | marcador de capítulo, na página inicial |
| `sect` | título de seção dentro de uma aba |
| `note` | ressalva com barra verde à esquerda |
| `calc` | parágrafo explicando como algo foi calculado |
| `scope` | as duas colunas "cobre" e "não alcança" |
| `readouts` / `readout` | a fileira de números grandes |
| `quest` | citação em itálico, usada na pergunta norteadora |

### A regra da tipografia

O sistema usa **três fontes**, cada uma com um papel:

- **Archivo** — toda informação: texto, números, rótulos, botões
- **Newsreader itálico** — **só a voz**: uma palavra-chave por título e as citações
- **IBM Plex Mono** — identificadores: `G1`, caminhos de URL, data de extração

A regra que mais importa: **a serif itálica nunca aparece em número, dado, botão ou rótulo.** Ela existe para marcar quando *alguém está afirmando algo*, não para enfeitar. Se colocar itálico num número, o número parece opinião.

Na prática, use `<em>` só em uma expressão por título:

```html
<h1 class="claim">O valor nominal sobe; a leitura real é <em>mais contida</em>.</h1>
```

---

## 6. Como mudar ou criar um gráfico

### A ordem de trabalho

```text
1. FORMA        qual é o trabalho do dado? (e é mesmo um gráfico?)
2. COR          o que a cor está fazendo aqui?
3. VALIDAR      rodar o validador de paleta, claro e escuro
4. MARCAS       finas, com respiro, rótulo seletivo
5. INTERAÇÃO    hover é entrega, não bônus
6. ACESSIBILIDADE  figure + figcaption + tabela gêmea
7. OLHAR        renderizar e conferir colisão, geometria, overflow
```

O passo 1 é o mais pulado e o mais importante.

### Antes de tudo: é mesmo um gráfico?

| O dado é… | Use | Não use |
|---|---|---|
| Um valor único, talvez com tendência | **indicador** (valor + variação) | gráfico de uma barra |
| Poucos números de abertura | **fila de indicadores** | barras agrupadas |
| O número que abre a página | **número grande** | — |
| Uma razão contra um limite | **medidor** | pizza de duas fatias |
| Mais de 7 categorias com significado | **tabela** | mais cores |

### Escolhendo a forma

| O leitor precisa… | Forma |
|---|---|
| Comparar magnitude | barra ou coluna |
| Ver tendência no tempo | linha |
| Distinguir várias séries | multilinha ou barras agrupadas |
| Ver que **uma** série é o ponto | **ênfase** — uma colorida, o resto em cinza |
| Ver acima e abaixo de uma referência | barra divergente |
| Parte do todo | barra empilhada |
| Antes → depois por item | **dumbbell** |

**A forma mais subutilizada é a ênfase.** Quando a história é "este aqui subiu", não é um gráfico categórico — é uma série no acento e todas as outras em cinza. Costuma ser a resposta certa quando alguém pede "deixa esse gráfico mais claro".

### Quantas séries cabem

| Séries | O que fazer |
|---|---|
| 1 a 3 | cor resolve; rotule direto na ponta da linha |
| 4 | rótulo direto vira obrigatório |
| 5 a 6 | limite confortável; use legenda |
| 7 a 8 | limite absoluto |
| 9 ou mais | **nunca invente uma cor nova** — agrupe o resto em "Outros", ou faça vários gráficos pequenos |

### Usando o componente de linha

```astro
---
import LineChart from "../../../components/LineChart.astro";
---
<LineChart
  labels={["2015","2016","2017"]}
  series={[
    { label: "Real",    className: "observed",  values: [4.44, 4.23, 4.53] },
    { label: "Nominal", className: "nominal",   values: [2.50, 2.59, 2.87] }
  ]}
  ariaLabel="Descrição do gráfico para quem não enxerga"
/>
```

Classes de série disponíveis: `observed`, `nominal`, `estimated`, `provisional`, `estimate-bound`.

### A estrutura completa de uma figura

Todo gráfico precisa de quatro coisas. Copie este molde:

```astro
<figure>
  <div class="figure-head">
    <span class="id">G8</span>
    <h2 class="title">Título do gráfico</h2>
    <span class="meta">período · unidade</span>
  </div>
  <div class="plot">
    <!-- o gráfico aqui -->
  </div>
  <figcaption>O achado em uma frase, <b>com o número</b>.</figcaption>
  <details class="twin">
    <summary>Tabela gêmea — abrir dados</summary>
    <div class="table-wrap">
      <table>
        <thead><tr><th scope="col">Ano</th><th scope="col">Valor</th></tr></thead>
        <tbody>
          <tr><th scope="row">2015</th><td>4,44</td></tr>
        </tbody>
      </table>
    </div>
  </details>
</figure>
```

**A tabela gêmea não é acessibilidade — é a prova.** É ela que permite a qualquer pessoa conferir o número que o gráfico desenha. Numa banca, é a diferença entre "o gráfico mostra" e "aqui está o dado".

O `scope="col"` e `scope="row"` são o que faz a tabela ser lida corretamente. Mantenha.

---

## 7. Erros de gráfico que custam credibilidade

Confira cada gráfico novo contra esta lista. Se bater com algum item, refaça.

**Codificação**

- **Dois eixos Y no mesmo gráfico.** É o erro número um. O alinhamento entre as duas escalas é arbitrário e **inventa correlação**. Em vez disso: dois gráficos separados, ou indexe as duas séries a uma base comum.
- **Recolorir ao filtrar.** A cor segue a entidade, não a posição no ranking. Se São Paulo é verde, continua verde quando você filtra.
- **Rampa de cor em categorias.** Deixar a barra maior mais escura duplica a informação do comprimento e gasta o único canal livre.
- **Cor de alerta usada como série.** Vermelho é falha metodológica, nunca "crescimento".

**Forma**

- **Barra que não começa no zero.** Comparação de comprimento com base cortada mente. Na versão antiga deste projeto, 235,97% e 85,91% apareciam com comprimento parecido.
- **Pizza de duas fatias, rosca para valores próximos.**
- **Oito cores quando a história é um número.**

**Marcas e eixos**

- **Marcas de eixo em números quebrados.** Na versão antiga havia passos de 75,05 milhões. Use números redondos.
- **Tracejado na grade.** Tracejado é reservado para **estimativa**. Se a grade for tracejada, o leitor não distingue mais o que é projeção.
- **Número escrito em cada ponto.**
- **Serifada no número grande.**

**Interação**

- **Tooltip como único jeito de ver o valor.** Quem usa teclado ou celular fica sem.
- **Alvo de clique menor que 24 px.**

**Honestidade do dado**

- **Média de médias no lugar de razão de somas.** Custo médio, taxa e participação se calculam como `Σ numerador ÷ Σ denominador` do período. Neste projeto a diferença é real: R$ 212,97 pela razão de somas contra R$ 210,59 pela média das médias.
- **Variação que atravessa quebra de denominador.** Em 2022 a base populacional muda de estimativa para Censo. A população caiu 4,80% e a taxa saltou 7,85% — dos quais **5,9 pontos eram artefato**, não crescimento. Se plotar taxa ano a ano, marque essa quebra no gráfico.
- **Média móvel na frente da série observada.** A linha suavizada fica **atrás**, mais fina e mais clara. Na versão antiga a média móvel era a linha grossa e o dado real um traço pálido — o leitor achava que estava vendo o dado.

---

## 8. O sistema visual

### Cores

Todas as cores ficam em `public/assets/style.css`, no bloco `:root`. **Nunca escreva uma cor direto num componente** — sempre `var(--nome)`. Assim o tema escuro continua funcionando.

| Token | Uso |
|---|---|
| `--bg`, `--tint`, `--raised` | fundos |
| `--ink`, `--ink2`, `--ink3` | texto principal, secundário, apagado |
| `--rule`, `--rule-2` | linhas e divisores |
| `--accent` | verde institucional, o destaque |
| `--link` | links |
| `--observed`, `--nominal`, `--estimate`, `--provisional` | os estados do dado |
| `--seq-1` a `--seq-7` | rampa do mapa |
| `--failure` | **só** falha metodológica |

Para mudar o visual inteiro, mude os tokens. Para mudar só o tema escuro, mexa nos dois blocos guardados no fim do arquivo.

**Se trocar cores de dado, rode o validador:**

```bash
node tools/validate_palette.js "#hex,#hex,…" --mode light
node tools/validate_palette.js "#hex,#hex,…" --mode dark --surface "#0C0F14"
```

Ele confere contraste e simulação de daltonismo. Não tente avaliar isso a olho.

### O que o projeto decidiu não fazer

Estas são restrições que o trabalho assumiu. Você pode revogar qualquer uma — só saiba que existem e por quê:

- **Sem cartões de indicador com o mesmo peso.** Um número é o herói; os outros são subordinados. Seis cartões iguais não dizem o que importa.
- **Sem gradiente em barra.** Barra é sólida e começa no zero.
- **Sem splash ou tela de carregamento.** O documento aparece no primeiro quadro.
- **Vermelho nunca para crescimento.** Só para falha metodológica.
- **Fundo branco, sem caixas.** Separação por linha fina e espaço, não por moldura em tudo.

---

## 9. Como está organizada a navegação, e por quê

A estrutura se chama **caderno aberto de evidências**: cada afirmação tem um endereço próprio.

A **página inicial** é a abertura narrativa — conduz do órgão até o achado, em seis capítulos:

1. O órgão — o rim 3D e o que a diálise substitui
2. Do tratamento ao registro — por que procedimento não é pessoa
3. A escala do que foi contado
4. A pergunta do trabalho
5. O que a série mostrou — o achado
6. Cada conclusão tem um endereço — o índice

As **abas de evidência** são o oposto: cada uma começa pela resposta e funciona sozinha, porque alguém pode chegar nela por um link direto, sem nunca ter passado pela home.

Toda aba de evidência segue a mesma ordem:

```text
resposta → alcance → evidência → como foi calculada
        → o que a enfraquece → endereço da próxima pergunta
```

**A divisão entre "alcance" e "o que enfraquece" tem uma regra**, e ela evita repetição:

- **Alcance** é o que a evidência **cobre**: medida, período, fonte, deflator
- **O que enfraquece** é o que pode torná-la **errada**: efeito de composição, quebra de denominador, ausência de registro

Se um item cabe nos dois, ele pertence ao segundo.

### Se quiser reorganizar

Pode. Duas coisas que vale preservar:

- **Nenhum gráfico em dois lugares.** Cada figura tem um endereço dono. Se G1 está em Valor, não coloque uma versão dele na home — quem quiser vê-lo vai até lá. Repetir gráfico foi o principal defeito da versão anterior do dashboard.
- **Cada aba funciona sozinha.** Teste: abra a aba direto pela URL, sem passar pela home. Unidade de contagem, período e limites precisam estar claros ali mesmo.

---

## 10. Antes de apresentar

```bash
npm run build                      # o site compila?
python scripts/validar_dados.py    # os dados estão coerentes?
npm run check:dossie               # o dossiê valida?
npm test                           # os testes passam?
node tools/auditar-rotas.mjs       # acessibilidade e layout
```

Os cinco precisam terminar sem erro.

Depois, olhe com os próprios olhos — **teste verde não substitui olhar a tela**:

- [ ] Abrir cada aba direto pela URL, sem passar pela home
- [ ] Reduzir a janela até uns 320 px e conferir que nada estoura para o lado
- [ ] Abrir uma tabela gêmea e conferir que os números batem com o gráfico
- [ ] Conferir se a ressalva de "procedimentos, não pessoas" aparece antes do primeiro gráfico
- [ ] Testar no celular
- [ ] Testar em tema claro e escuro

---

## 11. O que ainda depende de você

Estas coisas ficaram em aberto de propósito, porque são decisão sua e do orientador:

**Autoria.** A página `/sobre-a-base/` declara que autoria, orientação e instituição estão **pendentes de confirmação**. Preencha com os dados corretos — nada foi preenchido por suposição.

**Quatro perguntas de método:**

1. **DPAC e DPA entram no recorte?** Hoje não estão. Existe apenas diálise peritoneal intermitente, peritoneal para agudos e o treinamento DPAC-DPA. Se precisarem entrar, a extração muda e **todos os números mudam**.
2. **O `0405050054 CICLODIALISE` sai?** É procedimento oftalmológico e está dentro do recorte de 24 códigos. Não dá para medir o impacto sem re-extrair.
3. **A narrativa oficial passa a usar valores reais?** Em reais de jun/2026 o crescimento 2015→2025 é +11,34%, não +88,61%.
4. **A origem da previsão fica em junho ou volta para abril?** Junho inclui dois meses provisórios, subestimados em cerca de 1%.

**Um aviso importante:** o pipeline foi corrigido para não transformar ausência de registro em zero. **Isso mudou números territoriais.** Se você já tinha tabelas municipais escritas no TCC, confira se batem com as de agora. É melhor descobrir isso aqui do que na banca.

---

## 12. Onde estão as provas

Se a banca perguntar "como vocês sabem disso?", a resposta está nestes arquivos:

| Arquivo | O que prova |
|---|---|
| `docs/RECORTE-SIGTAP.md` | os 24 procedimentos do recorte, transcritos do cabeçalho do TabNet |
| `docs/CONTRATO-DOSSIE.md` | o contrato de dados: tipo, unidade, origem e estado de cada campo |
| `docs/QA-ROTAS-ONDA2.md` | auditoria de acessibilidade e layout, com números |
| `docs/limitacoes.md` | o que o trabalho não responde |
| `docs/modelagem_preditiva.md` | o backtest e a escolha do modelo |
| `SOURCES.md` | origem e licença de tudo que veio de fora |
| `docs/handoffs/` | o registro de cada etapa, com quem fez, o que mediu e o que ficou pendente |
| `docs/evidencias/` | as medições brutas em JSON e as capturas de tela |

---

## 13. Dúvidas frequentes

**Mudei um texto e não apareceu.** O `npm run dev` recarrega sozinho. Se estiver usando `npm run preview`, rode `npm run build` antes — o preview serve a versão compilada.

**Quero tirar uma aba.** Apague a pasta em `src/pages/` e remova o link do `BaseLayout.astro`. Confira se nenhuma outra página aponta para ela.

**O gráfico ficou estranho depois que mudei os dados.** Rode `python scripts/validar_dados.py`. Ele checa cerca de trinta invariantes e falha rápido, dizendo qual quebrou.

**Posso usar outra biblioteca de gráficos?** Pode. Só registre em `SOURCES.md` a versão e a licença **na mesma alteração** que a adiciona — é o que permite responder de onde veio cada coisa.

**Posso mudar as cores da marca?** Pode, é seu trabalho. Só rode o validador de paleta depois, porque contraste ruim é reprovável em critério objetivo, não em gosto.

**O rim 3D pesa muito?** São cerca de 360 KB, e **só carregam quando alguém clica em "Explorar em 3D"**. As outras 33 páginas não carregam nada de 3D. Se quiser tirar de vez, remova a seção do capítulo 01 e a linha do `kidney.js` no fim de `src/pages/index.astro`.

**Quero um gráfico que o sistema não tem.** O componente `LineChart.astro` serve de modelo: recebe dados, devolve SVG. Copie a estrutura dele para criar outro tipo. Só mantenha a moldura da seção 6 — `figure`, `figcaption` com o achado, e tabela gêmea.

---

Boa apresentação. O trabalho está honesto: todo número tem origem rastreável, toda ressalva está escrita, e o que o produto não consegue responder está declarado no próprio produto. **Isso é mais difícil de construir do que um painel bonito, e é o que sustenta uma defesa.**
