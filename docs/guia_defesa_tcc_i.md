# Guia de defesa do TCC I

## Tema do trabalho

Analise preditiva e monitoramento de custos da dialise no SUS: desenvolvimento de um dashboard para apoio a gestao em saude.

## Ideia central

O trabalho propoe o desenvolvimento de um prototipo de dashboard para analisar dados publicos do SIA/SUS - DATASUS sobre procedimentos de dialise no Brasil. A proposta e acompanhar a evolucao temporal dos valores aprovados, da quantidade de procedimentos, do custo medio, da distribuicao territorial e de uma previsao inicial baseada em modelo de aprendizagem supervisionada.

O foco do TCC I e apresentar o planejamento, a delimitacao dos dados, o prototipo funcional e a justificativa da solucao. A analise final, aprofundamento teorico e refinamento metodologico podem continuar no TCC II.

## Problema de pesquisa

Os procedimentos de dialise representam uma demanda continua e relevante para o SUS. Como esse tipo de atendimento envolve acompanhamento recorrente, estrutura especializada e custo assistencial elevado, gestores de saude precisam de ferramentas que facilitem o monitoramento dos gastos e da demanda.

O problema que o trabalho busca responder e:

Como uma solucao de analise preditiva e visualizacao de dados pode apoiar o monitoramento dos procedimentos de dialise no SUS, considerando custos, quantidade de procedimentos, comportamento pre e pos-pandemia e distribuicao territorial?

## Objetivo geral

Desenvolver um prototipo de dashboard para monitoramento temporal, territorial e preditivo dos procedimentos de dialise no SUS, utilizando dados publicos do DATASUS para apoiar a interpretacao de custos, demanda e tendencias.

## Objetivos especificos

1. Coletar e organizar bases publicas do SIA/SUS - DATASUS relacionadas aos procedimentos de dialise.
2. Tratar e integrar dados mensais e municipais sobre valor aprovado e quantidade aprovada.
3. Calcular indicadores de valor aprovado, quantidade aprovada, custo medio e crescimento por periodo.
4. Comparar o comportamento dos procedimentos antes, durante e depois da pandemia.
5. Identificar concentracao territorial por municipio, UF e regiao.
6. Testar modelos preditivos para estimar o valor aprovado mensal.
7. Construir um dashboard web para comunicacao dos resultados e apoio exploratorio a tomada de decisao.

## Justificativa

O tema e relevante porque a dialise esta associada a doencas renais cronicas, que exigem tratamento continuo e geram impacto importante na rede publica de saude. Monitorar esses procedimentos ajuda a compreender a pressao assistencial e financeira sobre o SUS.

O dashboard tambem se justifica porque dados publicos do DATASUS podem ser dificeis de interpretar diretamente no TabNet. Ao transformar esses dados em visualizacoes, indicadores e previsoes, o projeto facilita a comunicacao de informacoes para gestores, pesquisadores e profissionais da area da saude.

## Por que usar "dialise" e nao apenas "hemodialise"

O termo dialise foi escolhido porque e mais amplo. Ele permite incluir procedimentos relacionados a terapia dialitica no SUS, nao apenas uma modalidade especifica.

Hemodialise e um tipo de dialise. Dialise tambem pode envolver outras formas de terapia renal substitutiva, dependendo dos procedimentos selecionados no DATASUS. Por isso, para o recorte do dashboard, o termo dialise e mais adequado.

Na apresentacao, uma boa resposta e:

"Eu optei pelo termo dialise porque o recorte do DATASUS envolve procedimentos relacionados a terapia dialitica como um conjunto. Hemodialise e uma modalidade importante, mas usar apenas esse termo poderia restringir o escopo do estudo."

## Fonte dos dados

Fonte principal:

- SIA/SUS - Sistema de Informacoes Ambulatoriais do SUS.
- DATASUS/TabNet.

Os dados utilizados sao agregados e publicos. O trabalho nao usa dados pessoais de pacientes.

## Recorte dos dados

Abrangencia geografica:

- Brasil.
- Analise territorial por municipio, UF e regiao.

Periodo:

- Janeiro de 2015 a abril de 2026.
- O ano de 2026 e parcial e deve ser interpretado separadamente.

Unidade de analise:

- Procedimentos aprovados no SUS.
- Nao representa numero unico de pacientes.

## Variaveis principais

Valor aprovado:

- Valor financeiro aprovado pelo SUS para os procedimentos analisados.
- E a principal variavel de custo.

Quantidade aprovada:

- Numero de procedimentos aprovados.
- Ajuda a interpretar demanda/uso assistencial.
- Nao deve ser chamada diretamente de numero de pessoas.

Custo medio:

- Calculado como valor aprovado dividido pela quantidade aprovada.
- Ajuda a observar mudancas no custo por procedimento.

Tempo:

- Ano.
- Mes.
- Ano/mes de atendimento.

Territorio:

- Municipio.
- UF.
- Regiao.

## O que o dashboard mostra

Visao geral:

- Valor aprovado total.
- Quantidade aprovada.
- Custo medio.
- Crescimento entre o primeiro ano e o ultimo ano fechado.
- Serie historica mensal.
- Valor anual.
- Participacao por grupo de procedimento.

Pandemia:

- Comparacao entre pre-pandemia, pandemia e pos-pandemia.
- Media mensal de valor aprovado.
- Custo medio por periodo.

Previsao:

- Modelo de aprendizagem selecionado.
- Previsao dos 12 meses seguintes ao ultimo dado disponivel.
- Comparacao real x previsto no periodo de teste.

Territorio:

- Mapa do Brasil por UF.
- Ranking de municipios por valor aprovado e quantidade aprovada.
- Comparacao por regiao.
- Crescimento pos-pandemia.
- Comparacao do recorte selecionado com o Brasil.

Metodologia:

- Fonte.
- Periodo.
- Tratamento.
- Modelo.
- Etapas do projeto.

TCC:

- Objetivo geral.
- Objetivos especificos.
- Recorte do estudo.
- Pontos importantes para apresentacao.

Triagem:

- Modulo demonstrativo/educativo.
- Nao faz diagnostico.
- Nao faz parte da modelagem com DATASUS.
- Serve para mostrar uma possibilidade futura de apoio educativo no dashboard.

## Principal cuidado conceitual

O trabalho analisa procedimentos aprovados, nao pacientes individuais.

Por isso, evite dizer:

"Aumentou o numero de pessoas em dialise."

Prefira dizer:

"Aumentou a quantidade de procedimentos aprovados."

Ou:

"Os dados sugerem aumento do uso assistencial relacionado aos procedimentos de dialise no SUS."

## Principais resultados que voce pode citar

Com a base corrigida:

- Periodo analisado: janeiro de 2015 a abril de 2026.
- Valor aprovado total: aproximadamente R$ 39,19 bilhoes.
- Quantidade aprovada total: aproximadamente 184,7 milhoes de procedimentos.
- Custo medio geral: aproximadamente R$ 212 por procedimento.
- Crescimento do valor aprovado entre 2015 e 2025: aproximadamente 88,61%.
- Crescimento da quantidade aprovada entre 2015 e 2025: aproximadamente 40,46%.
- Modelo selecionado: Ridge Regression.
- MAPE medio do modelo vencedor: aproximadamente 2,54%.

## Modelo preditivo usado

O modelo selecionado foi Ridge Regression.

Ele e um modelo supervisionado de regressao. A ideia e prever o valor aprovado mensal a partir de variaveis temporais e historicas.

Foram testados modelos de baseline e modelos de aprendizagem. O Ridge foi escolhido porque apresentou o menor MAPE medio no backtesting temporal.

Voce pode explicar assim:

"Foram testados modelos para previsao mensal do valor aprovado. O modelo selecionado foi o Ridge Regression, porque apresentou melhor desempenho medio na validacao temporal, usando MAPE como metrica principal. A previsao e tratada como apoio exploratorio a gestao, nao como determinacao exata do gasto futuro."

## O que e MAPE

MAPE significa Mean Absolute Percentage Error, ou erro percentual absoluto medio.

Ele mostra, em media, o quanto a previsao errou em termos percentuais.

Exemplo de fala:

"Um MAPE menor indica que o modelo errou menos em termos percentuais. No meu caso, o Ridge teve MAPE medio de aproximadamente 2,54%, o que indica bom desempenho exploratorio dentro dos recortes testados."

## O que e backtesting temporal

Backtesting temporal e uma forma de testar modelos respeitando a ordem do tempo.

Em vez de misturar dados aleatoriamente, o modelo treina com dados anteriores e testa em periodos futuros.

Isso faz sentido porque, em previsao temporal, o modelo nao pode aprender com informacoes do futuro.

Exemplo de fala:

"Eu usei validacao temporal porque o problema envolve serie historica. Assim, o modelo e treinado com dados passados e avaliado em meses posteriores, simulando melhor uma situacao real de previsao."

## Por que o Ridge pode ser adequado

O Ridge Regression e uma regressao linear regularizada. Ele ajuda a reduzir instabilidade quando existem varias variaveis explicativas relacionadas entre si, como defasagens, medias moveis e variaveis temporais.

Ele tambem e mais interpretavel do que modelos muito complexos, o que e positivo para um TCC I e para um prototipo inicial.

## Variaveis usadas na modelagem

As variaveis da modelagem incluem:

- Ano.
- Mes.
- Indice temporal.
- Sazonalidade mensal.
- Defasagens do valor aprovado.
- Medias moveis do valor aprovado.
- Defasagem da quantidade aprovada.
- Media movel da quantidade aprovada.
- Defasagem do custo medio.

Essas variaveis ajudam o modelo a capturar tendencia, sazonalidade e comportamento historico.

## Por que a previsao comeca em 2026-05

A base tratada vai ate abril de 2026.

Por isso, a previsao comeca no mes seguinte:

- Primeiro mes previsto: maio de 2026.
- Ultimo mes previsto: abril de 2027.

Ela nao representa o ano fechado de 2027. Representa os 12 meses seguintes ao ultimo dado disponivel.

## Sobre a aba Triagem

A aba Triagem deve ser explicada com cuidado.

Ela nao usa os dados agregados do DATASUS.

Ela e um modulo demonstrativo e educativo, criado para mostrar uma possibilidade de expansao futura do dashboard.

Fala sugerida:

"A aba Triagem nao tem finalidade diagnostica e nao compoe a analise preditiva dos dados do DATASUS. Ela foi mantida como modulo demonstrativo, para exemplificar como o dashboard poderia futuramente incluir uma interface educativa de apoio a triagem de risco renal."

## Limitacoes do trabalho

1. Os dados representam procedimentos aprovados, nao pacientes unicos.
2. O ano de 2026 esta parcial.
3. A base e agregada e publica, sem variaveis clinicas individuais.
4. A previsao e exploratoria.
5. O custo medio e uma aproximacao calculada pelo valor aprovado dividido pela quantidade aprovada.
6. O dashboard ainda e um prototipo, podendo ser refinado no TCC II.
7. A analise nao permite concluir causalidade direta entre pandemia e aumento dos procedimentos, apenas comparar periodos.

## O que voce pode defender como contribuicao

O trabalho contribui ao:

- Organizar dados publicos do DATASUS em uma base tratada.
- Criar indicadores de acompanhamento da dialise no SUS.
- Comparar periodos pre, durante e pos-pandemia.
- Mapear concentracao territorial.
- Testar modelos preditivos para apoio exploratorio.
- Desenvolver um dashboard web funcional para comunicacao dos resultados.

## O que evitar na defesa

Evite afirmar:

- Que o dashboard mostra numero de pacientes.
- Que o modelo preve com certeza o gasto futuro.
- Que a pandemia causou diretamente o aumento.
- Que a triagem faz diagnostico.
- Que o prototipo esta finalizado como produto definitivo.

Prefira afirmar:

- O dashboard monitora procedimentos aprovados.
- A previsao e exploratoria.
- A analise compara periodos e identifica tendencias.
- A triagem e demonstrativa.
- O TCC I apresenta o planejamento e o prototipo inicial.

## Perguntas que o professor pode fazer

### Por que esse tema e relevante?

Porque a dialise e um procedimento recorrente, de alta importancia assistencial e com impacto financeiro relevante no SUS. Monitorar custos e demanda pode apoiar a gestao em saude.

### Qual e a fonte dos dados?

SIA/SUS - DATASUS/TabNet, com dados publicos e agregados.

### Voce esta analisando pacientes?

Nao. Estou analisando procedimentos aprovados. A base nao identifica pacientes unicos.

### Por que usar dashboard?

Porque o dashboard facilita a comunicacao dos resultados, permite filtros e ajuda a visualizar tendencias temporais e territoriais de forma mais clara do que tabelas brutas.

### Por que usar Ridge Regression?

Porque foi o modelo de aprendizagem supervisionada com melhor desempenho medio no backtesting temporal, considerando o MAPE como metrica principal.

### A previsao e definitiva?

Nao. Ela e exploratoria e serve como apoio a interpretacao de tendencias.

### Por que 2026 aparece como parcial?

Porque a base disponivel vai ate abril de 2026. Assim, 2026 nao deve ser comparado como ano fechado.

### Por que a aba Triagem existe?

Ela e demonstrativa e educativa. Mostra uma possibilidade futura de expansao da ferramenta, mas nao substitui avaliacao profissional e nao faz diagnostico.

## Fala curta para apresentar o projeto

"Meu TCC tem como objetivo desenvolver um prototipo de dashboard para monitorar procedimentos de dialise no SUS, usando dados publicos do DATASUS. A proposta combina analise temporal, comparacao pre e pos-pandemia, distribuicao territorial e uma previsao inicial com modelo de aprendizagem supervisionada. O foco e apoiar a comunicacao dos dados e a interpretacao de tendencias de custo e uso assistencial, deixando claro que os dados representam procedimentos aprovados, nao pacientes individuais."

## Fala sobre metodologia

"A metodologia envolve coleta dos dados no DATASUS, tratamento em Python, criacao de indicadores mensais e territoriais, comparacao entre periodos e teste de modelos preditivos. O modelo escolhido foi o Ridge Regression, por apresentar menor MAPE medio no backtesting temporal. Os resultados foram comunicados por meio de um dashboard web interativo."

## Fala sobre resultados preliminares

"Os resultados preliminares indicam crescimento do valor aprovado e da quantidade de procedimentos aprovados ao longo da serie historica. Tambem foi identificada concentracao territorial em grandes municipios e aumento medio no periodo pos-pandemia em comparacao ao pre-pandemia. Esses achados devem ser interpretados como tendencias em dados agregados de procedimentos."

## Proximos passos para o TCC II

1. Refinar a revisao bibliografica.
2. Formalizar metodologia e criterios de selecao dos procedimentos.
3. Documentar melhor os modelos testados.
4. Melhorar validacao estatistica.
5. Ajustar linguagem academica dos resultados.
6. Gerar relatorio final e apresentacao.
7. Melhorar responsividade e acabamento do dashboard.

