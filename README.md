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
├── docs/
│   └── relatorio_analise_tcc_dialise.md
├── dados_tratados/
│   ├── previsao_dialise_2024_2026.csv
│   ├── procedimentos_dialise_filtrados.csv
│   └── resultado_dialise_anual.csv
├── scripts/
│   └── tratamento_dialise.py
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

## Como reproduzir o tratamento inicial

1. Instalar dependencias:

```bash
pip install -r requirements.txt
```

2. Rodar o script de tratamento:

```bash
python scripts/tratamento_dialise.py
```

O script gera os arquivos tratados em `dados_tratados/`.

## Saidas geradas

- `resultado_dialise_anual.csv`: custo anual filtrado de dialise, custo ambulatorial total e participacao percentual.
- `procedimentos_dialise_filtrados.csv`: procedimentos identificados como relacionados a dialise.
- `previsao_dialise_2024_2026.csv`: previsoes iniciais usando tendencia linear anual e crescimento historico medio.

## Proximos passos

1. Baixar dados mensais filtrados por procedimentos de dialise.
2. Criar uma base unica com `ano`, `mes`, `municipio`, `procedimento`, `valor_aprovado` e `quantidade_aprovada`.
3. Fazer analise exploratoria com graficos historicos.
4. Testar modelos preditivos de serie temporal.
5. Desenvolver o dashboard em Streamlit ou Power BI.
