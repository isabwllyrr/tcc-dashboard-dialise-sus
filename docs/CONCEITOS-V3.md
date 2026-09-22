# DialisaSUS — três conceitos para uma publicação acadêmica pública

**15/09/2026 · Arquitetura de conceito · Branch conferida: `remodelacao-v2`**

Propostas para decisão, sem implementação. Este documento não altera dados, método nem decisões permanentes do projeto. O pedido desta rodada prevalece sobre os trechos anteriores que mantêm a triagem, vetam o rim em todo o sistema ou apresentam o Gradient Boosting nominal como vencedor absoluto.

## 1. Diagnóstico

“Relatório vivo + instrumentos” acerta ao transformar números dispersos em uma resposta e acabar com gráficos repetidos.
Seu ponto fraco é tratar uma sequência de leitura como a entrada natural de todos os públicos.
O gestor recorrente procura um território; a banca procura a sustentação de uma afirmação; o leitor precisa aprender a unidade.
Uma home longa pode atender o último e impor percurso aos outros dois.
“Vivo” também sugere atualização contínua que um recorte encerrado em jun/2026, sozinho, não promete.
O melhor achado é a divergência entre volume e valor real por procedimento, com períodos de comparação explícitos.
A previsão merece avaliação pública, mas não precisa ser o clímax da história.
O rim deve explicar a relação entre função, tratamento recorrente e contagem, sem converter anatomia em estatística.
Eu conservaria a resposta editorial e a autoria única de cada gráfico, mas mudaria a unidade de navegação para evidências verificáveis.

## 2. Três conceitos

### Contrato comum: o que nenhuma alternativa pode perder

**Identidade e entrada direta.** Cabeçalho: “DialisaSUS — produto acadêmico de TCC”. Autoria, orientação e instituição aparecem com os dados efetivamente fornecidos, sem nomes preenchidos por suposição. Ministério da Saúde/DATASUS e IBGE são fontes, nunca identidade visual ou chancela. Acesso público, sem login. A interface não promete atualização em tempo real.

Antes do primeiro gráfico de **cada rota**, inclusive quando acessada por um link externo, aparece: **“Esta base conta procedimentos aprovados, não pessoas. Uma pessoa pode realizar vários procedimentos.”** O aprofundamento distingue SIA, que registra procedimentos, de Censo da SBN, que mede pacientes. A referência de 12 a 13 sessões mensais de hemodiálise vem do pedido; é contexto ilustrativo, nunca divisor dos 187,95 milhões nem frequência universal. O recorte também inclui procedimentos que não são sessões.

**Números fechados.** A abrangência publicada permanece:

| Informação | Valor autorizado e leitura |
| :--- | :--- |
| Total, jan/2015–jun/2026 | R$ 40,03 bi nominais / R$ 52,74 bi em reais de jun/2026 |
| Quantidade e unidade | 187,95 mi de procedimentos aprovados |
| Valor médio aprovado por procedimento | R$ 212,97 nominal / R$ 280,62 real; razão entre somas |
| Cobertura | 138 competências; 498 municípios com registros; 24 procedimentos no recorte; local de atendimento |
| Comparação entre anos completos, 2015 → 2025 | Valor aprovado: +88,61% nominal / +11,34% real |
| Pré → pós-pandemia | Quantidade: +23,71%; valor por procedimento: +22,28% nominal / −13,74% real |
| Definição dos períodos | Pré: 2015–2019; pandemia: 2020–2021; pós: 2022–2025 |
| Validação do modelo | Alvo nominal: Gradient Boosting MAPE 5,35%, Holt-Winters 4,44%; viés do Gradient Boosting de −1,6% a −8,0% ao longo do horizonte. Alvo real: Gradient Boosting MAPE 3,92%, vencedor da comparação informada |

O quadro acima é especificação de conteúdo, não autorização para digitar esses números em componentes. Na interface, números, períodos, legendas, tabelas, ressalvas quantitativas e respostas do assistente saem do **mesmo dossiê versionado gerado pelo pipeline**. A busca local desta rodada não encontrou arquivo com nome `dossie`; sua existência e seu esquema ainda precisam ser verificados na execução. Não se inventam chaves nem se preenchem lacunas à mão.

**Alcance das conclusões.** “A remuneração perdeu da inflação” significa queda do valor médio aprovado por procedimento em poder de compra medido pelo IPCA. Não demonstra corte na tabela SUS, aumento do custo de operação, perda de qualidade, número de pacientes ou causalidade da pandemia. O mix de procedimentos pode afetar a média. As duas comparações temporais acima não formam uma única decomposição: seus períodos são diferentes. Não somar percentuais nem apresentar participações logarítmicas instáveis na decomposição real.

**Território.** Comparações anuais usam 2015–2025. A legenda junto do mapa diz: “Por local de atendimento: polos regionais podem apresentar taxa por habitante elevada por atender pessoas de outros municípios.” Taxa não vira prevalência, demanda reprimida ou ocupação. Município sem registro no recorte não significa ausência de pacientes ou de serviço. Mudança de base populacional em 2022 deve ser visível; nenhuma variação que atravesse essa quebra é anunciada como crescimento assistencial. A população interpolada de 2023 é identificada como estimada. Não se desenham fluxos origem–destino, capacidade instalada ou filas: essas informações não estão disponíveis aqui.

**Estados e dinheiro.** Observado, estimado e provisório têm famílias de cor, formas e palavras diferentes. Especificação funcional, ainda sem escolher hexadecimais:

| Estado | Forma e texto | Cor |
| :--- | :--- | :--- |
| Observado | Traço sólido, marcadores preenchidos; “Observado” | Família do observado; real no acento, nominal em cinza |
| Estimado | Traço tracejado, marcadores triangulares; “Estimado”; faixa apenas quando calculada e disponível | Família exclusiva de estimativa, com nominal e real distinguíveis quando aplicável |
| Provisório | Losangos e área hachurada, interrupção da continuidade visual consolidada; “Provisório” | Família exclusiva de provisório, sem reutilizar cores dos outros estados |

As famílias precisam ser validadas contra os tokens do projeto; texto usa a cor de texto, não a cor da série. Legenda e rótulos diretos permanecem. Em taxas, discriminar também a procedência do denominador: população estimada não vira observação só porque o numerador veio do SIA. **Mai/2026 e jun/2026** aparecem marcados como provisórios, com a ressalva de subestimação aproximada de **1%**. Totais que os incluem carregam a mesma ressalva. Não corrigir os valores automaticamente.

Nominal e real aparecem simultaneamente, no mesmo eixo monetário e com a base “reais de jun/2026”; não há alternância que esconda um deles, segundo eixo ou controle deslizante que apague metade da comparação. Quantidades têm sua própria figura ou texto, sem compartilhar eixo monetário.

**Limite da previsão nesta proposta.** Os resultados de validação nominal e real podem ser comparados, com alvo e protocolo explícitos. Uma curva futura nominal não se converte em curva real sem premissa para inflação futura. Essa premissa não foi fornecida. Portanto, os conceitos incluem **avaliação do modelo, não um gráfico de valores monetários futuros fabricado para completar a narrativa**. Preservam-se os resultados existentes, sem trocar o modelo do pipeline nem recalcular previsões. O MAPE não vira intervalo de confiança; 3,92% não significa “96,08% de certeza”.

**Acessibilidade e composição.** Cada figura é SVG no HTML inicial, dentro de `figure`, acompanhada de `figcaption` com o achado numérico e tabela gêmea com cabeçalhos. Links reais permitem percorrer conteúdo e recortes publicados sem JavaScript. Filtros avançados são melhoria; o acesso às tabelas e aos recortes não depende deles. Teclado e toque recebem o mesmo conteúdo do hover; mira por data nas linhas. Mapa usa seleção textual e tabela como acesso principal. Paleta categórica será validada em claro e escuro; mapa sequencial usa um matiz, luminosidade monotônica e até sete classes. Barras partem de zero; eixos têm marcas redondas.

### Inventário fechado das figuras: prova de não repetição

A identidade de uma figura é **pergunta + população/território + período + medida**. Trocar título, cor ou fazer uma miniatura não cria outra figura. As seis figuras abaixo são o teto editorial proposto, não obrigação de preencher espaço. Uma figura só entra quando seus dados e sua legenda existem no dossiê.

| ID | Pergunta e figura | Limite de uso |
| :--- | :--- | :--- |
| G1 | Como o valor nacional mudou? Linhas anuais nominal e real, 2015–2025, mesmo eixo em R$ | Não ganha cópia mensal monetária nem miniatura na entrada dos instrumentos |
| G2 | O que mudou no valor por procedimento entre pré e pós? Dumbbells dos valores médios nominal e real, mesmo eixo em R$/procedimento | A quantidade +23,71% fica na legenda, ao lado da queda real −13,74%; não vira segunda escala nem soma de contribuições |
| G3 | Como a quantidade nacional se distribui no tempo? Linha mensal de procedimentos, jan/2015–jun/2026 | Últimos meses provisórios; não apresenta pessoas nem dinheiro |
| G4 | Onde os procedimentos foram aprovados para atendimento? Mapa por UF de taxa anual, com tabela territorial | Um ano por vez; tabela traz também quantidade absoluta e valores nominal/real; sem segundo ranking gráfico da mesma fatia |
| G5 | Como o valor evoluiu na UF selecionada? Par anual nominal/real no mesmo eixo, 2015–2025 | Escala territorial distinta de G1; não oferece opção “Brasil” que republicaria G1 |
| G6 | Como o viés nominal do modelo muda com o horizonte? Viés do Gradient Boosting e Holt-Winters por horizonte do backtest | Não é curva de gasto futuro. A tabela de comparação de modelos ao lado explicita MAPE e alvo nominal/real, sem fabricar resultados ausentes |

Cada conceito abaixo atribui **um único endereço dono a cada ID**. Índices, assistente e chamadas usam texto e links para esse endereço, sem copiar a figura. Tabela gêmea, versão impressa e fallback são representações da mesma figura, não novas vitrines editoriais. Mudanças de UF/ano são estados do documento dono, com endereço reproduzível; não originam um segundo painel. O rim é uma ilustração explicativa, não um sétimo gráfico dos dados.

### A. Ensaio público — “Mais procedimentos, menos valor real por procedimento”

**Tese:** DialisaSUS é um ensaio visual que conduz o leitor da unidade de contagem ao achado econômico e oferece instrumentos para conferir suas implicações.

#### Primeiros 30 segundos

- **0–10 s:** autoria acadêmica; frase “Procedimentos aprovados não são pacientes”; título com a tese e o par +88,61% nominal / +11,34% real, explicitamente 2015–2025. Sem gráfico ou cena bloqueando a abertura.
- **10–20 s:** uma rolagem leva à demonstração “O tratamento termina; a necessidade continua”. O rim e o circuito externo relacionam função e repetição. A conclusão textual já existe antes de a cena carregar.
- **20–30 s:** aparece a prova G1 e o leitor encontra o par nominal/real. A navegação oferece “Explorar sua UF” desde o início; completar o ensaio não é requisito de acesso.

São momentos pretendidos de leitura, não duração medida nem animação temporizada.

#### Arquitetura e propriedade

| Rota | Função única | Figuras que possui |
| :--- | :--- | :--- |
| `/` | Construir o argumento nacional: unidade → valor → quantidade → valor unitário → alcance | G1, G2, G3, em seções distintas |
| `/explorar/` | Consultar e comparar território, com estado explícito de UF/ano | G4, G5 |
| `/previsao/` | Examinar qualidade e limites do modelo | G6; tabela de modelos |
| `/metodologia/` | Auditar fontes, recorte, transformações, versões e forma de citação | Nenhuma; documentos e tabelas metodológicas |
| `/assistente/` | Localizar respostas no dossiê e apontar a evidência | Nenhuma; pergunta completa, resposta citada e link |

**Prova:** G1–G3 só na home; G4–G5 só no explorador; G6 só na avaliação. O capítulo da home sobre modelo é uma frase de resultado contraditório com link, não réplica do laboratório. O fechamento territorial não recebe mapa. As páginas de UF são estados do explorador, não sumários com gráficos copiados.

#### Rim 3D: uma função, vários encontros

**Pergunta:** “Por que terminar uma sessão não elimina a necessidade de outra?”

O mesmo esquema corporal permanece. Primeiro localiza-se o rim; depois evidencia-se o filtro externo; por fim, o retorno ao tratamento mantém a referência à mesma pessoa esquemática. O rim não é removido, multiplicado ou transformado numa máquina. O circuito de hemodiálise pertence ao acesso vascular do corpo, nunca ao ureter ou a uma ligação direta da máquina ao rim.

O ganho do volume é permitir inspecionar a relação dentro/fora e manter a referência espacial durante a mudança de ponto de vista. **Quem explica recorrência é a sequência, não o giro do órgão.** A cena não demonstra toda a fisiologia nem representa todos os procedimentos do recorte.

Camada: **Three.js isolado**, com GLB e poucos enquadramentos guiados; rolagem local reversível, com controles textuais equivalentes. Um gesto “Inspecionar em 3D” libera a rotação limitada do conjunto. Não há órbita automática, scroll travado ou trilha de seis efeitos copiada de uma apresentação de produto. O estado anatômico permanece; muda o enquadramento e o foco explicativo.

**Orçamento proposto:** até **900 KB** adicionais transferidos: 120 KB de imagens de fallback + 240 KB de runtime/carregadores/controle + 400 KB de malha comprimida + 140 KB de texturas. Meta de **60 fps durante movimento**; sem render contínuo em repouso. Fallback e critérios de degradação na seção técnica comum abaixo. É a opção de maior custo de coreografia.

#### Dobras e silêncio

| Dobra / área | Nível 1 | O que fica quieto |
| :--- | :--- | :--- |
| Abertura: pergunta e par de crescimento | Nenhum | Cabeçalho, números e chamada estáticos; sem count-up |
| Demonstração da recorrência | Apenas a cena renal | Texto curto, fundo opaco, navegação parada; sem gráficos visíveis ao lado |
| Valor nacional — G1 | Nenhum | Gráfico já legível; mira e foco são feedback local |
| Quantidade — G3 | Nenhum | Legenda e ressalva de provisório abertas |
| Valor por procedimento — G2 | Nenhum | Comparação estática, sem animar números positivos contra negativos |
| Modelo, limites e ação final | Nenhum | Síntese curta, fontes e “Explorar sua UF” |
| Explorador, modelo, metodologia e assistente | Nenhum em todas as dobras | Filtros, tabelas e formulário sem cenário, partículas ou rim |

**Regra de composição:** alternar abertura compacta → demonstração espaçosa → evidência densa → fechamento curto. Texto até 65 caracteres por linha; demonstração em proporção aproximada 2:1 entre imagem e texto no desktop, empilhada no mobile; títulos com cerca de duas vezes o tamanho do corpo. Nenhum bloco exige 100vh. O princípio vem da alternância de densidade do “Case em quatro tempos”, sem copiar sua moldura ou console.

**Sacrifício:** o argumento fica forte para a primeira visita, mas custa rolagem e memória para retornar a uma prova específica. O rim disputa espaço com a chegada rápida ao achado, mesmo sem bloquear acesso. **Serve melhor ao leitor comum**, com boa apresentação oral para a banca.

### B. Mesa de consulta — “Comece pelo território”

**Tese:** DialisaSUS é uma mesa pública de consulta territorial, acompanhada da evidência nacional necessária para interpretar o recorte escolhido.

#### Primeiros 30 segundos

- **0–10 s:** a pessoa lê identidade acadêmica, unidade de contagem e uma síntese nacional com os dois períodos explicitados: crescimento nominal/real em 2015–2025; quantidade e valor por procedimento no pré/pós.
- **10–20 s:** escolhe UF e ano por controles rotulados, com links para os mesmos recortes em HTML. “Consultar território” é a ação dominante. A ressalva “local de atendimento” antecede o resultado.
- **20–30 s:** recebe G4 e a tabela no recorte. A seleção leva à evolução monetária da UF em G5. A comparação entre absoluto e taxa aparece na tabela, sem quatro cartões iguais.

O resultado inicial usa 2025, último ano completo, identificado na tela; a seleção de UF é deliberada. Não há geolocalização presumida.

#### Arquitetura e propriedade

| Rota | Função única | Figuras que possui |
| :--- | :--- | :--- |
| `/` | Mesa territorial; controles e resultados no mesmo documento | G4, G5 |
| `/panorama/` | Interpretar a evolução nacional | G1, G2, G3 |
| `/modelo/` | Julgar a validade das estimativas | G6; tabela de modelos |
| `/entender-a-contagem/` | Explicar o que um procedimento representa, com o rim | Nenhuma figura quantitativa |
| `/metodologia/` | Conferir origem, recorte, cálculo e versão | Nenhuma |
| `/assistente/` | Responder dúvidas sobre o recorte consultado com fonte e endereço | Nenhuma |

**Prova:** a home não contém curva nacional; `/panorama/` não contém mapa ou ranking. O explicador não repete G3 para justificar sua existência. Assistente devolve o endereço do resultado, sem gerar outro dashboard. UF e ano vivem na URL da mesa; não alteram silenciosamente o panorama nacional.

#### Rim 3D: a unidade que a consulta pressupõe

**Pergunta:** “O que estou contando quando seleciono ‘quantidade de procedimentos’?”

Mora exclusivamente em `/entender-a-contagem/`, alcançável pela definição junto da unidade no explorador. O objeto conecta rim e filtro externo a uma atividade que volta a acontecer. O percurso termina na distinção textual **pessoa / sessão / procedimento aprovado**: sessão é um exemplo de procedimento, não sinônimo de todo o recorte. Não há formulário clínico ou teste de conhecimento que impeça voltar à consulta.

Camada: **Three.js sob demanda**, câmera parada até interação, botões “Localizar o rim” e “Ver o filtro externo”, com inspeção do volume por teclado/toque. Sem vínculo com scroll. A malha ajuda a separar função corporal e intervenção externa; a explicação administrativa fica em HTML. O endereço de retorno preserva o território da consulta, mas não cria uma sessão com login.

**Orçamento proposto:** até **700 KB** adicionais: 100 KB de fallback + 240 KB de runtime/carregadores/controle + 260 KB de malha comprimida + 100 KB de texturas. Meta de **60 fps em manipulação**, sem render contínuo em repouso; a home transfere **0 KB de runtime e malha 3D**. Mesma degradação funcional da seção comum.

#### Dobras e silêncio

| Dobra / área | Nível 1 | O que fica quieto |
| :--- | :--- | :--- |
| Home: síntese e seleção territorial | Nenhum | Uma linha de controles acima dos resultados; números estáticos |
| Home: mapa e tabela — G4 | Nenhum | Mapa não gira, não pulsa, não faz voo de câmera |
| Home: evolução da UF — G5 | Nenhum | Mira, foco e seleção como feedback local |
| Panorama: abertura, G1, G3, G2 e limites | Nenhum em cada dobra | Evidência com rótulo direto e texto, sem narrativa de movimento |
| Explicador: definição | Nenhum | Unidade e limite visíveis antes da cena |
| Explicador: relação rim–filtro | Apenas a inspeção 3D | Fundo opaco, instrução curta, nenhum dado territorial junto |
| Explicador: contagem e retorno | Nenhum | Conclusão e link de volta à consulta |
| Modelo, metodologia e assistente | Nenhum em todas as dobras | Tabelas e formulário sem efeitos de apresentação |

**Regra de composição:** resultado ocupa aproximadamente três quartos da largura útil; orientação textual ocupa o restante no desktop. No mobile a orientação vem antes do resultado. Mesmo peso para rótulos de filtros, hierarquia maior para o título do recorte; cabeçalho da consulta informa ano e UF sem caixa decorativa. Nomes de municípios têm precedência sobre comprimento de barras. A densidade é estável para facilitar repetição da tarefa.

**Sacrifício:** a conclusão nacional deixa de organizar a experiência; quem consulta apressadamente pode nunca examinar o mecanismo econômico ou visitar o rim. O 3D tem utilidade pontual, porém menor probabilidade de ser visto. O mapa pode incentivar leitura de demanda local que a ressalva precisa conter. **Serve melhor ao gestor recorrente.**

### C. Caderno aberto de evidências — “Cada conclusão tem um endereço”

**Tese:** DialisaSUS é uma publicação acadêmica navegável por afirmações verificáveis, em que cada evidência reúne resposta, consulta, método e limite no mesmo endereço.

#### Primeiros 30 segundos

- **0–10 s:** identidade acadêmica e unidade de contagem. A abertura diz: **“O volume cresceu; o valor real por procedimento caiu.”** Abaixo, duas linhas separadas: “2015–2025: +88,61% nominal / +11,34% real no valor aprovado”; “Pré → pós-pandemia: quantidade +23,71%; valor por procedimento +22,28% nominal / −13,74% real”. As datas impedem que as linhas pareçam uma soma.
- **10–20 s:** “Conferir o achado” é o único botão dominante. Uma lista textual oferece também “Entender o que foi contado”, “Consultar território” e “Avaliar o modelo”. Não são cartões iguais com números concorrentes.
- **20–30 s:** a pessoa abre uma evidência. A primeira tela já traz resposta, alcance e advertência relevante; a figura começa em seguida. Banca e gestor não precisam percorrer os outros documentos para usar aquele.

#### Arquitetura e propriedade

| Rota | Pergunta própria e função | Figuras que possui |
| :--- | :--- | :--- |
| `/` | Qual é a conclusão e por onde posso conferi-la? Índice editorial com sínteses e links | Nenhuma |
| `/evidencias/contagem/` | O que a base conta? Explicador renal, unidade e evolução da quantidade | G3, depois da demonstração |
| `/evidencias/valor/` | Mais valor nominal significa a mesma expansão em termos reais? Argumento econômico e seu cálculo | G1, G2 |
| `/evidencias/territorio/` | Onde os procedimentos são aprovados para atendimento? Evidência territorial com consulta de UF/ano | G4, G5 |
| `/evidencias/modelo/` | Em que condições o modelo funciona e onde perde? Avaliação com protocolo e erros abertos | G6; tabela de modelos |
| `/sobre-a-base/` | De onde vem esta publicação? Autoria, citações, extrações, recorte e versões | Nenhuma; fontes e tabelas documentais |
| `/assistente/` | Em qual evidência encontro uma resposta sustentada? Localização e explicação com citação | Nenhuma |

**Prova:** G1 e G2 pertencem a valor, G3 a contagem, G4 e G5 a território, G6 a modelo. A home contém afirmações em texto, nunca resumos gráficos. Não há `/explorar/` ou `/previsao/` concorrentes: os instrumentos estão nos próprios documentos de evidência. A fonte comum não republica os resultados; documenta sua origem.

Isso é diferente de repartir o ensaio A em URLs: **a unidade editorial é uma afirmação auditável, não uma etapa de uma história**. Cada documento precisa funcionar em leitura isolada e seguir a mesma ordem: resposta → alcance → evidência → como foi calculada → o que a enfraquece → endereço da próxima pergunta. Um link de “Como foi calculado” leva à seção do próprio documento; não expulsa o leitor para uma metodologia genérica.

Na evidência de modelo, a derrota nominal para Holt-Winters aparece antes da vitória do Gradient Boosting no alvo real. Na territorial, o controle de UF está na primeira tela, sob a ressalva. Os rótulos de navegação dizem a tarefa — “Consultar território” — mesmo que a URL tenha “evidências”.

#### Rim 3D: do corpo ao evento, do evento ao registro

**Pergunta:** “Qual parte do cuidado reaparece na contagem, sem que apareça uma pessoa nova?”

Mora em `/evidencias/contagem/`, na seção demonstrativa anterior a G3. A cena preserva uma referência corporal e permite inspecionar a posição do rim e a função de filtração desempenhada pelo circuito externo. Abaixo, uma sequência **em HTML** mostra tratamento → repetição do tratamento → registros de procedimentos, com o rótulo permanente **“Esquema explicativo; não são registros de pacientes desta base”**. A transição para G3 marca a mudança de natureza: dali em diante são quantidades agregadas observadas/provisórias do SIA.

O usuário pode reenquadrar o volume e voltar ao estado anterior para conferir que **o objeto corporal permanece, enquanto os eventos se repetem**. Não há contador de pessoas, prontuário fictício, fluxo real entre municípios, transformação do rim em gráfico ou 187,95 milhões de partículas. Tampouco se afirma correspondência universal de um tratamento com um único registro: a cena explica a diferença entre unidade corporal e unidade administrativa.

Camada: **Three.js sob demanda**, com dois enquadramentos nomeados e inspeção limitada; a sequência explicativa é independente da câmera. Não usa scroll como relógio, nem X-Ray para inventar anatomia interna. Uma única malha pode receber destaque de superfície sem trocar geometria. O rim continua reconhecível, opaco e espacial; nenhum efeito de “doença” é simulado.

**Orçamento proposto:** até **750 KB** adicionais: 120 KB de fallback em vistas equivalentes + 240 KB de runtime/carregadores/controle + 280 KB de malha comprimida + 110 KB de texturas. Meta de **60 fps em interação**, sem render contínuo em repouso. As outras rotas, inclusive a home, carregam **0 KB de runtime e malha 3D**. O custo menor que A decorre da ausência de coreografia por scroll, não de uma promessa de compressão já obtida.

#### Dobras e silêncio

| Dobra / área | Nível 1 | O que fica quieto |
| :--- | :--- | :--- |
| Home: conclusão e alcance | Nenhum | Duas comparações com períodos explícitos; sem contagem animada |
| Home: índice de evidências e autoria | Nenhum | Links em lista, separadores finos, uma chamada dominante |
| Contagem: definição | Nenhum | Procedimento ≠ pessoa antes da cena e de G3 |
| Contagem: demonstração espacial | Apenas a inspeção do rim | Texto curto, sem tabela ou gráfico dividindo a atenção |
| Contagem: eventos/registro e G3 | Nenhum | Esquema e dado separados por título e explicação; cena já fora da dobra |
| Valor: resposta, G1, G2, cálculo e limites | Nenhum em cada dobra | Gráficos estáticos com interação de leitura; prova não fica colapsada |
| Território: seleção, G4, G5 e limites | Nenhum em cada dobra | Instrumento inteiro quieto, incluindo mudanças de filtro |
| Modelo: comparação, G6 e protocolo | Nenhum em cada dobra | A crítica ao modelo tem o mesmo acesso visual que sua melhor métrica |
| Sobre a base e assistente | Nenhum em todas as dobras | Documento e formulário; só foco, estados e confirmação de ações |

**Regra de composição:** uma coluna de leitura de até 65 caracteres; figuras podem usar a largura maior do documento. Em desktop, resposta ocupa cerca de dois terços e “alcance desta afirmação” um terço; no mobile, alcance vem imediatamente depois da resposta. Título com cerca do dobro do corpo; números destacados em sans, algarismos proporcionais, no mínimo 48 px quando forem o número-herói, e tabulares apenas em colunas. Peso tipográfico cai de conclusão para explicação e para fonte, mas ressalva mantém tamanho e contraste de leitura. Espaço entre evidências é maior que entre gráfico, legenda e tabela, preservando sua associação.

**Sacrifício:** perde a continuidade de uma apresentação guiada e a familiaridade imediata de um painel. Exige títulos precisos e disciplina editorial para não fragmentar uma mesma prova em documentos demais. O rim não vira a assinatura visual de todas as páginas. **Serve melhor à banca**, com consulta direta utilizável pelo gestor e uma entrada curta para o leitor comum.

### Decisão técnica do rim: matriz aplicada aos três conceitos

**O requisito permanece: existe um rim tridimensional manipulável no caminho enriquecido de todas as alternativas.** A representação estática é a base acessível e o fallback, não a substituição silenciosa do requisito.

| Degrau | A: ensaio | B: consulta | C: evidências |
| :--- | :--- | :--- | :--- |
| HTML + CSS + vistas pré-renderizadas | Explica a sequência e atende à leitura sem JS; não permite verificar o volume em outro ângulo | Explica a definição; não permite inspeção espacial comandada pelo leitor | Explica a contagem; não preserva uma geometria inspecionável entre pontos de vista |
| Canvas 2D | Acrescentar animação raster não resolve a inspeção do volume | Mesmo limite; overhead sem benefício para a consulta | Mesmo limite; a sequência administrativa já funciona melhor em HTML |
| WebGL puro | Entregaria volume, mas exigiria manter carregamento, cena e recuperação próprios | Complexidade desproporcional ao pequeno visualizador | Não há efeito singular de shader que pague essa manutenção |
| **Three.js** | Escolhido para geometria, câmera e poucos estados guiados | Escolhido somente no explicador solicitado | Escolhido somente na demonstração da unidade |
| R3F / GSAP / física / WebGPU | Não necessários à experiência proposta | Não necessários | Não necessários |

**Justificativa honesta da subida:** CSS já entrega o argumento verbal e temporal. O ganho adicional procurado no 3D é **inspeção espacial com continuidade do mesmo objeto**, que imagens planas transformadas não entregam como geometria. Isso é uma hipótese de ganho de compreensão, não resultado de teste. Não se acrescenta anatomia complexa apenas para justificar WebGL. Se o giro só distrair, retira-se a órbita livre e conserva-se o rim 3D nos enquadramentos funcionais; o requisito continua atendido, com menos interação.

**Perfil do destino antes da produção do asset:** um rim em cena, tamanho intermediário, sem macro de tecidos, sem órgãos internos reconstruídos por inferência, com elemento esquemático de filtro externo. Materiais opacos simples; sem HDRI pesado, sombras dinâmicas, bloom, partículas, física, transparência aditiva ou pós-processamento. Rótulos e explicações ficam no DOM. O rim não é instrumento diagnóstico. A sequência de seis etapas de `THREEJS-SCROLL-STORYTELLING` é referência, não obrigação: wireframe, X-Ray e desmonte não explicam estas perguntas.

**Custos:** os KB acima são **tetos propostos de transferência comprimida**, incluindo runtime, asset e fallback; não são medidas de um build nem tamanhos documentados de bibliotecas. Não incluem o restante do site. Texturas e malha também ocupam memória descomprimida; isso precisa de medição no aparelho de teste, ainda não definido. Se o teto não couber, simplificar materiais, texturas e detalhe sem comprometer silhueta; não declarar uma meta batida porque só o GLB cabe nela.

**Fps e degradação:** 60 fps corresponde a cerca de 16,7 ms por quadro total; 30 fps, a 33,3 ms. São metas de comportamento, não estimativa de “quantos fps o rim custa”. Não há como quantificar perda de fps sem cena, viewport e aparelho. Medir somente durante interação, depois do carregamento, usando janelas de 60–120 frames. Como critério proposto, média abaixo de 35 fps em três janelas consecutivas reduz a densidade de pixels até 1 e fixa o enquadramento; persistindo desempenho abaixo de 30 fps, troca para as vistas estáticas. Um frame isolado não aciona degradação.

**Fallback de verdade:** imagens do mesmo modelo aprovado e explicação integral já estão no HTML; sem JS, sem WebGL, falha de download ou perda de contexto continuam legíveis. Não há retângulo vazio, splash ou aviso pedindo aceleração gráfica. `prefers-reduced-motion` desliga transições e scroll ligado à câmera; os estados são acessíveis sem movimento. Fora da viewport ou com aba oculta, parar render; na saída, liberar recursos. Botões textuais, foco visível, teclado e toque substituem o arraste de precisão. Em mobile fraco, vistas estáticas preservam a explicação e a identidade do objeto.

Em A, a inicialização depende da entrada da seção demonstrativa na viewport; altura e limites dessa seção precisam acompanhar fontes, imagens e redimensionamento. Em B e C, o runtime só é solicitado na rota explicativa após ação de inspeção. Não há listeners de cena ativos no explorador, no modelo ou no formulário do assistente.

### O ativo existente: descartar como matriz anatômica, preservar como referência de inventário

`web_dashboard/assets/renal-astra-lab.png` foi inspecionado: **1.832.229 bytes**, fundo preto, contraluz ciano e brilho incorporados à imagem, superfície muito texturizada e uma única vista do órgão. É uma imagem de apresentação; não fornece geometria nem valida o que existe atrás da superfície.

**Decisão para as três alternativas:** não usar esse PNG como entrada do modelo explicativo via image-to-3D e não carregá-lo como fallback de 1,8 MB. Não apagar o arquivo nesta rodada. A iluminação embutida e a vista única aumentam a ambiguidade para reconstrução; uma geração plausível não é garantia anatômica. Sua teatralidade também empurra o produto para uma imagem de laboratório que os dados administrativos não sustentam.

O asset de produção deve partir de **referência anatômica verificável e direito de uso confirmado**, ou de modelo já documentado; nenhum candidato foi selecionado nesta rodada. Tripo é uma rota possível de rascunho a partir de referência limpa, não certificação de anatomia. Pela nota do Vault, começar com a opção de malha otimizada para web; avaliar o resultado antes de pedir maior fidelidade. Não é necessário comprar ou gerar nada para decidir o conceito.

Após obter um asset adequado: normalizar orientação/escala, preservar silhueta, priorizar compressão de encoding e texturas; se simplificar, fundir vértices antes, limpar e deduplicar, comprimir texturas e aplicar Meshopt. O GLB bruto não vai direto para a página. Os mesmos enquadramentos aprovados originam as imagens de fallback. Não prometer interior renal com um material X-Ray: transparência não cria estruturas anatômicas ausentes.

**Oclusão tipografia–objeto: não aplicada à informação.** O princípio de profundidade foi considerado, mas rim não cobre “procedimentos”, “não são pacientes”, números, fontes ou controles. Em um TCC, esconder justamente a palavra qualificadora pode inverter o enunciado. Não é necessário copiar o wordmark gigante ou a composição do portfólio para usar profundidade.

### Fonte externa e limites desta rodada

O índice do Vault foi consultado; as notas indicadas cobrem experiência, dados e 3D, mas não constituem fonte clínica de anatomia. A única consulta externa foi a página primária [Hemodialysis — NIDDK](https://www.niddk.nih.gov/health-information/kidney-disease/kidney-failure/hemodialysis), em 15/09/2026: sustenta o filtro externo, a repetição de tratamentos e a substituição de **parte**, não de todas, as funções renais. Essa fonte ampara apenas a explicação clínica básica; não sustenta os números brasileiros, o modelo ou o recorte administrativo.

Arquiteturas, proporções, orçamentos de KB, critério operacional de fps e teste abaixo são **propostas de projeto desta análise**, derivadas das regras consultadas; não benchmarks, estudos de usabilidade realizados ou citações do Vault. Não se afirma que o 3D ensina melhor antes de testar. `BUGS.md` do projeto no Vault e `MAESTRI.md` no repositório não foram encontrados; nenhuma decisão depende de conteúdo presumido desses arquivos.

## 3. Comparação

Julgamento qualitativo, relativo entre as alternativas. Acessibilidade e rigor são requisitos eliminatórios; notas melhores em outras colunas não compensam falhas nesses dois pontos.

| Critério | A — Ensaio público | B — Mesa de consulta | C — Caderno de evidências |
| :--- | :--- | :--- | :--- |
| Clareza do achado central | Muito alta ao completar a leitura; risco de abandono antes da prova | Média: síntese visível, mas a consulta territorial domina | Alta desde a entrada; depende de títulos que preservem períodos e qualificadores |
| Utilidade para gestão | Média: exige sair do argumento para operar | Muito alta para consulta territorial recorrente; não mede capacidade ou demanda reprimida | Alta: território é acessível diretamente e acompanha seus limites |
| Risco técnico | Maior: coreografia renal, rolagem e sincronização | Menor no caminho principal; 3D isolado, maior exigência de filtros e estados | Menor na publicação; moderado no módulo renal e nos recortes territoriais |
| Custo de construção | Alto relativo: narrativa contínua e QA de movimento | Médio: instrumento territorial é o centro; tutorial isolado | Médio: menos coreografia, mais trabalho editorial de evidências autônomas |
| Defensabilidade numa banca | Alta; a sequência ajuda a apresentação, mas separa prova e método | Média–alta; o painel não demonstra sozinho a contribuição acadêmica | Muito alta: afirmação, alcance, protocolo e contraprova ficam juntos |
| Acessibilidade | Atende o contrato; maior superfície de risco no scroll 3D | Atende o contrato; filtros e mapa exigem equivalência textual rigorosa | Atende o contrato; navegação sem sequência obrigatória, 3D localizado; risco de fragmentação |

## 4. Recomendação

**Escolheria C — Caderno aberto de evidências.** A contribuição deste TCC não é oferecer mais vistas da mesma série: é sustentar uma leitura que muda quando se considera inflação, unidade de contagem, denominador territorial e alvo do modelo. Uma arquitetura por evidências torna essas condições parte da resposta, em vez de ressalvas que o visitante precisa procurar depois.

O gestor entra direto em “Consultar território”. A banca encontra o protocolo junto da afirmação. O leitor comum recebe a tese na primeira tela e pode aprofundar a contagem. O rim faz seu trabalho na dúvida conceitual mais perigosa, antes de a quantidade virar curva, sem colonizar os instrumentos.

Não escolheria C apenas por parecer acadêmico. Ele só vence se **cada documento funcionar sozinho**, e se a home continuar comunicando as duas comparações sem exigir uma coleção de cliques. Por isso não há índice burocrático, resumo gráfico repetido ou metodologia separada para entender o cálculo local.

**Condição para mudar de ideia:** no ciclo de testes de uso já previsto no Vault, se as tarefas reais mostrarem que a necessidade dominante é voltar repetidamente a UF/ano e que a navegação por evidências atrapalha localizar essa consulta, escolheria **B**. Se o uso decisivo for uma apresentação guiada da autora e os leitores perderem o encadeamento entre as provas mesmo após melhorar os títulos, **A** passa a servir melhor. São critérios de decisão a observar, não resultados já encontrados.

## 5. Teste de falha do conceito recomendado

O conceito fracassa se transparência virar fragmentação ou se o rim ensinar uma unidade falsa. Testar primeiro com roteiro e representação das telas, sem precisar construir produção nesta rodada.

| O que teria de ser verdade para C fracassar | Tarefa concreta de teste | Evidência de falha e consequência |
| :--- | :--- | :--- |
| A abertura aproxima números com períodos diferentes a ponto de produzir uma conclusão errada | Mostrar a home e pedir que a pessoa explique quais períodos sustentam crescimento do valor e queda unitária | Ela soma +23,71% com −13,74%, ou atribui ambos a 2015–2025. Separar visualmente as comparações e retestar antes de seguir |
| A demonstração ensina “procedimento = sessão = pessoa” | Após `/evidencias/contagem/`, perguntar o que 187,95 mi permite concluir e se é possível dividir por 12 ou 13 | Qualquer interpretação de total de pacientes é falha eliminatória do conteúdo. A sequência e os rótulos precisam mudar; não basta acrescentar rodapé |
| O volume tridimensional não acrescenta compreensão à tarefa espacial | Contrapor cena manipulável e suas mesmas vistas estáticas; pedir que o leitor identifique o que permanece e o que se repete | O giro aumenta hesitação ou a pessoa acha que a máquina substitui fisicamente o órgão. Manter o rim 3D, retirar movimentos sem função e reenquadrar a demonstração |
| O leitor precisa visitar todos os documentos para entender um só | Entrar diretamente em valor, território ou modelo, sem passar pela home | A unidade, o período, o alvo ou o limite só ficam claros depois de navegar para outra rota. O documento não é autônomo; C ainda não está resolvido |
| “Evidências” impede o gestor de encontrar sua tarefa | Pedir “consulte sua UF no último ano completo e explique a taxa” | A pessoa abre o modelo ou procura um dashboard inexistente. Primeiro corrigir rótulos; persistindo a dificuldade e predominando consulta recorrente, migrar a entrada para B |
| A honestidade territorial não resiste ao mapa | Pedir que interprete um polo com taxa alta e explique o que sabe sobre residentes | Ela conclui prevalência, quantidade de pacientes locais ou falta de máquinas. A ressalva não está cumprindo sua função; rever legenda e apresentação da taxa |
| O melhor MAPE apaga a contraprova | Pedir que explique quando Gradient Boosting vence e quando perde | Ela responde “é o melhor modelo” sem identificar o alvo, ou lê erro médio como garantia futura. Dar à comparação e ao viés precedência sobre a métrica favorável |
| O produto só funciona quando o enriquecimento funciona | Repetir leitura com JS desligado, WebGL indisponível, movimento reduzido, teclado e viewport estreita | Qualquer afirmação, tabela, limite ou recorte publicado fica inacessível. Corrigir a entrega estática; não compensar com instrução de ativar JS |
| A promessa de fonte única não pode ser cumprida | Rastrear cada número e frase quantitativa da proposta até a saída versionada do pipeline | Falta uma medida ou o gráfico exige série inexistente. Completar o contrato com dados já disponíveis ou retirar a apresentação dependente; não digitar número, reextrair nem mudar resultado nesta rodada |
| O projeto não consegue obter um rim verificável dentro do orçamento | Revisar origem, direito de uso, geometria, vistas e custo do candidato antes de integrá-lo | Só há imagem generativa ambígua ou uma cena inviável no aparelho de teste. A dependência de asset segue aberta; reduzir detalhe e manter explicação estática acessível durante a preparação, sem declarar o requisito 3D entregue |

O teste é de compreensão e execução de tarefas; uma pequena rodada qualitativa não demonstra eficácia estatística do 3D. A aprovação do conceito não autoriza escrever conclusões clínicas novas nem trocar os resultados da autora.

## 6. Linhas VAULT

VAULT: C:\Users\Antonio\AI-Vault\00-SISTEMA\MEMORY_PROTOCOL.md → Separação entre proposta de sessão e decisão permanente; não registrar alternativa ainda não escolhida como arquitetura vigente.

VAULT: C:\Users\Antonio\AI-Vault\04-DECISOES-GLOBAIS\DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md → Consulta anterior à decisão, declaração da lacuna clínica e rastreabilidade nota por nota nesta entrega.

VAULT: C:\Users\Antonio\AI-Vault\04-DECISOES-GLOBAIS\DECISAO-SOBERANIA-DOS-DESIGN-TOKENS.md → Regras de proporção e hierarquia sem inventar paleta ou substituir tokens fornecidos pelo usuário.

VAULT: C:\Users\Antonio\AI-Vault\01-PROJETOS\DialisaSUS\CONTEXTO.md → Unidade administrativa, limites dos códigos, atendimento versus residência, maturação dos meses e quebra do denominador territorial.

VAULT: C:\Users\Antonio\AI-Vault\01-PROJETOS\DialisaSUS\DECISOES.md → Dono único de cada gráfico, dossiê único, razão de somas, limites da decomposição e provas do modelo; trechos superados identificados pelo pedido atual.

VAULT: C:\Users\Antonio\AI-Vault\01-PROJETOS\DialisaSUS\TEXTO-GERAL-DO-PROJETO.md → Pergunta norteadora, períodos e abrangência do produto; nenhuma conversão de procedimentos em pacientes ou importação de futuras bases como se existissem.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\PADROES\PADRAO-ARQUITETURA-LANDING-PAGE.md → Uma função por seção e por rota; sequência adaptável, ação dominante clara e ausência de duplicação editorial.

VAULT: C:\Users\Antonio\AI-Vault\01-PROJETOS\Portfolio-Antonio\Pesquisa-Visual\Composicoes\Case-em-Quatro-Tempos.md → Alternância de densidade em A e associação espacial entre argumento e prova, sem copiar moldura, console ou indicadores do exemplo.

VAULT: C:\Users\Antonio\AI-Vault\01-PROJETOS\Portfolio-Antonio\Pesquisa-Visual\Composicoes\Oclusao-Tipografia-Objeto.md → Técnica considerada e recusada sobre qualificadores, números e controles; profundidade não pode comprometer leitura acadêmica.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\PRINCIPIOS\EFEITO-COM-FUNCAO.md → Cada cena renal responde uma pergunta; o ganho espacial é separado da explicação temporal e submetido a teste.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\PRINCIPIOS\HIERARQUIA-DE-EFEITOS.md → No máximo um Nível 1 na demonstração; zero Nível 1 nos instrumentos, documentos de leitura e formulários.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\PRINCIPIOS\MOTION-BUDGET.md → Apenas a cena se move na dobra demonstrativa; um convite de interação, fundo quieto e suspensão fora da viewport.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\PRINCIPIOS\ESCOLHA-DE-TECNOLOGIA-PELA-EXPERIENCIA.md → Camada técnica escolhida por inspeção espacial e manutenção, com comparação explícita contra CSS e Canvas 2D.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\3D-WEB\INTRODUCAO-3D-WEB.md → Destino, tamanho, quantidade de objetos, interação e orçamento definidos antes do asset; leitura essencial preservada na degradação.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\3D-WEB\MATRIZ-TECNOLOGIAS-INTERATIVAS.md → Escada HTML/CSS → Canvas → WebGL → Three.js aplicada às três propostas; sem R3F, física ou WebGPU sem necessidade demonstrada.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\3D-WEB\THREEJS-SCROLL-STORYTELLING.md → Em A, estados locais reversíveis e medição que acompanha reflow; roteiro de seis efeitos não tratado como obrigação.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\3D-WEB\THREEJS-RENDER-MODES.md → Reutilizar geometria em destaques de material; wireframe e X-Ray não são prova anatômica nem requisitos da cena.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\3D-WEB\THREEJS-PERFORMANCE.md → Degradação por janelas de vários frames, redução de resolução, suspensão em repouso e liberação de recursos.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\3D-WEB\GLTF-TRANSFORM-OTIMIZACAO.md → Compressão antes de destruir silhueta; weld antes de simplify quando necessário; orçamento inclui texturas e decodificação.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\3D-WEB\TRIPO-AI-IMAGE-TO-3D.md → Referência limpa e rascunho otimizado para web; geração não dispensa normalização nem revisão anatômica do asset.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\WEB-MOTION\PATTERN-SCROLL-3D-PRODUTO.md → Objeto demonstra uma relação funcional apenas em seção dedicada; nenhum objeto movido por scroll atrás de painel, texto longo ou formulário.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\ANTI-PADROES\ANTI-PADRAO-3D-DESNECESSARIO.md → O requisito do rim permanece, com posição delimitada, ganho verificável e corte de ornamentação sem função.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\ANTI-PADROES\ANTI-PADRAO-WEBGL-SEM-FALLBACK.md → Imagens e explicação disponíveis antes da cena; falha de contexto não produz vazio nem pedido de configuração técnica ao leitor.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\PADROES\PADRAO-DATAVIZ-ACESSIVEL.md → Figure, figcaption numérica e tabela gêmea no HTML inicial; nominal/real juntos, três estados distintos, denominador explícito e validação de cor prevista.

VAULT: C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\00-INDICE-CONHECIMENTO.md → Consulta das regras soberanas e entradas pertinentes antes de recorrer à fonte clínica externa; propostas e custos não apresentados como fatos medidos.
