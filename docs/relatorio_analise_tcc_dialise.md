# Relatorio de apoio - DialisaSUS

## Tema atualizado

Analise temporal, territorial e preditiva dos procedimentos de dialise no SUS: desenvolvimento da plataforma web DialisaSUS para apoio a gestao em saude.

## Pergunta norteadora

Como os procedimentos de dialise aprovados no SUS evoluiram no periodo pre e pos-pandemia, considerando valor aprovado, quantidade aprovada, distribuicao territorial e previsao exploratoria?

## Recorte do estudo

- Abrangencia geografica: Brasil.
- Fonte: SIA/SUS - DATASUS/TabNet.
- Periodo: janeiro de 2015 a abril de 2026.
- Unidade de analise: procedimentos aprovados, nao pacientes unicos.
- Variaveis principais: valor aprovado, quantidade aprovada e custo medio.

## Objetivo geral

Desenvolver um prototipo web para analisar a evolucao temporal, territorial e preditiva dos procedimentos de dialise aprovados no SUS, apoiando a leitura sobre pressao assistencial, custos publicos e planejamento em saude.

## Objetivos especificos

- Tratar e integrar bases publicas do SIA/SUS relacionadas a procedimentos de dialise.
- Comparar o comportamento dos indicadores nos periodos pre-pandemia, pandemia e pos-pandemia.
- Identificar concentracao territorial por UF e municipio.
- Testar modelos de aprendizagem supervisionada para previsao do valor aprovado mensal.
- Desenvolver uma visualizacao web interativa para comunicar os resultados do estudo.

## Pontos que precisam ficar claros na defesa

- O estudo mede procedimentos aprovados, nao quantidade de pacientes.
- O ano de 2026 esta parcial e deve ser interpretado separadamente.
- A previsao e exploratoria e nao determina o gasto futuro de forma exata.
- O modelo selecionado foi Ridge Regression, escolhido pelo menor MAPE medio no backtesting temporal.
- A aba de triagem renal e demonstrativa e representa uma possibilidade de expansao futura da plataforma.
