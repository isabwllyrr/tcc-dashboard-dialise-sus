# TCC - Analise preditiva e monitoramento de custos da dialise no SUS

Este repositorio reune os arquivos do TCC sobre analise preditiva e monitoramento de custos da dialise no SUS, com foco no desenvolvimento de um dashboard para apoio a gestao em saude.

## Tema

Analise preditiva e monitoramento de custos da dialise no SUS: desenvolvimento de um dashboard para apoio a gestao em saude.

## Objetivo geral

Desenvolver uma solucao de analise e visualizacao de dados capaz de monitorar a evolucao dos custos da dialise no SUS e gerar previsoes iniciais para apoiar decisoes de gestao em saude.

## Estrutura do projeto

```text
.
├── analise.ipynb
├── dados_brutos/
│   ├── qtd_mensal_dialise_brasil.csv
│   └── valor_mensal_dialise_brasil.csv
├── dados_tratados/
│   ├── dialise_anual_brasil_total.csv
│   ├── dialise_mensal_brasil_por_grupo.csv
│   ├── dialise_mensal_brasil_total.csv
│   ├── previsao_dialise_2024_2026.csv
│   ├── procedimentos_dialise_filtrados.csv
│   └── resultado_dialise_anual.csv
├── docs/
│   └── relatorio_analise_tcc_dialise.md
├── scripts/
│   ├── tratamento_dialise.py
│   └── tratamento_mensal_dialise.py
├── sia_cnv_*.csv
├── requirements.txt
└── README.md
```

## Dados utilizados

Os arquivos `sia_cnv_*.csv` foram exportados do TabNet/DATASUS, a partir do Sistema de Informacoes Ambulatoriais do SUS (SIA/SUS).

Bases iniciais:

- Valor aprovado por ano/mes de atendimento.
- Quantidade aprovada por municipio e ano de processamento.
- Valor aprovado por procedimento e ano de processamento.
- Valor aprovado mensal de procedimentos de dialise no Brasil, por grupo de procedimento.
- Quantidade aprovada mensal de procedimentos de dialise no Brasil, por grupo de procedimento.

## Como reproduzir o tratamento inicial

1. Instalar dependencias:

```bash
pip install -r requirements.txt
```

2. Rodar o tratamento anual inicial:

```bash
python scripts/tratamento_dialise.py
```

3. Rodar o tratamento mensal nacional de dialise:

```bash
python scripts/tratamento_mensal_dialise.py
```

Os scripts geram os arquivos tratados em `dados_tratados/`.

## Saidas geradas

- `resultado_dialise_anual.csv`: custo anual filtrado de dialise, custo ambulatorial total e participacao percentual.
- `procedimentos_dialise_filtrados.csv`: procedimentos identificados como relacionados a dialise.
- `previsao_dialise_2024_2026.csv`: previsoes iniciais usando tendencia linear anual e crescimento historico medio.
- `dialise_mensal_brasil_por_grupo.csv`: base mensal nacional, por grupo de procedimento, com valor, quantidade e custo medio.
- `dialise_mensal_brasil_total.csv`: base mensal nacional consolidada.
- `dialise_anual_brasil_total.csv`: resumo anual nacional de valor, quantidade, custo medio e variacao percentual.

## Observacao sobre os novos arquivos mensais

As novas bases mensais foram baixadas para Brasil, nao apenas Ceara. O script recorta o periodo de 2015 a 2023 e ignora linhas parciais de 2014, 2025 e 2026 presentes no arquivo exportado pelo TabNet.

## Proximos passos

1. Decidir se o TCC sera Brasil ou Ceara.
2. Se o recorte for Ceara, baixar as mesmas bases mensais filtradas por dialise para Ceara.
3. Criar analise exploratoria com graficos historicos mensais.
4. Testar modelos preditivos de serie temporal com a base mensal.
5. Desenvolver o dashboard em Streamlit ou Power BI.
