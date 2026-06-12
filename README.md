# TCC - Analise preditiva e monitoramento de custos da dialise no SUS

Este repositorio reune os arquivos do TCC sobre analise preditiva e monitoramento de custos da dialise no SUS, com foco no desenvolvimento de um dashboard para apoio a gestao em saude.

## Tema

Analise preditiva e monitoramento de custos da dialise no SUS: desenvolvimento de um dashboard para apoio a gestao em saude.

## Recorte do estudo

- Abrangencia geografica: Brasil.
- Fonte dos dados: SIA/SUS - DATASUS/TabNet.
- Periodo principal: janeiro de 2015 a abril de 2026, com 2026 tratado como ano parcial.
- Variaveis principais: valor aprovado, quantidade aprovada e custo medio.
- Objeto: procedimentos relacionados a dialise no SUS.

## Objetivo geral

Desenvolver uma solucao de analise e visualizacao de dados capaz de monitorar a evolucao dos custos da dialise no SUS e gerar previsoes iniciais para apoiar decisoes de gestao em saude.

## Estrutura do projeto

```text
.
├── dashboard/
│   ├── app.py
│   └── README.md
├── web_dashboard/
│   ├── app.js
│   ├── index.html
│   ├── README.md
│   └── styles.css
├── dados_brutos/
│   ├── qtd_mensal_dialise_brasil.csv
│   ├── qtd_municipio_dialise_brasil.csv
│   ├── valor_mensal_dialise_brasil.csv
│   └── valor_municipio_dialise_brasil.csv
├── dados_tratados/
│   ├── comparacao_real_previsto_2022_atual.csv
│   ├── dialise_anual_brasil_total.csv
│   ├── dialise_mensal_brasil_por_grupo.csv
│   ├── dialise_mensal_brasil_total.csv
│   ├── indicadores_anuais_brasil.csv
│   ├── indicadores_grupo_brasil.csv
│   ├── indicadores_municipio_brasil.csv
│   ├── metricas_modelos_preditivos.csv
│   ├── municipio_dialise_brasil_long.csv
│   ├── previsao_mensal_proximos_12m.csv
│   ├── qtd_municipio_dialise_brasil_wide.csv
│   ├── valor_municipio_dialise_brasil_wide.csv
│   └── serie_mensal_dashboard.csv
├── docs/
│   ├── modelagem_preditiva.md
│   ├── relatorio_analise_tcc_dialise.md
│   └── resultados_exploratorios.md
├── scripts/
│   ├── analise_exploratoria.py
│   ├── modelagem_preditiva.py
│   ├── tratamento_municipio_dialise.py
│   ├── tratamento_dialise.py
│   └── tratamento_mensal_dialise.py
├── analise.ipynb
├── requirements.txt
└── README.md
```

## Como reproduzir

1. Instalar dependencias:

```bash
pip install -r requirements.txt
```

2. Tratar as bases mensais nacionais:

```bash
python scripts/tratamento_mensal_dialise.py
```

3. Gerar indicadores exploratorios:

```bash
python scripts/analise_exploratoria.py
```

4. Tratar a base territorial por município:

```bash
python scripts/tratamento_municipio_dialise.py
```

5. Rodar a modelagem preditiva inicial:

```bash
python scripts/modelagem_preditiva.py
```

6. Abrir o dashboard Streamlit antigo/prototipo:

```bash
streamlit run dashboard/app.py
``` 

7. Abrir o dashboard web customizado:

```powershell
.\.venv\Scripts\python.exe -m http.server 8080
``` 

Depois acesse:

```text
http://localhost:8080/web_dashboard/
```

## Resultados iniciais

- Periodo analisado: 136 meses, de janeiro de 2015 a abril de 2026.
- Valor aprovado total no periodo: aproximadamente R$ 39,19 bilhoes.
- Crescimento do valor aprovado entre 2015 e 2025, ultimo ano fechado: aproximadamente 88,61%.
- Modelo preditivo inicial com melhor desempenho no teste: media movel de 12 meses.
- MAPE do melhor modelo no periodo de teste de 2022 ao ultimo mes disponivel: aproximadamente 5,52%.

## Dashboards

O projeto possui duas interfaces: uma versao inicial em Streamlit e uma versao web customizada em HTML/CSS/JS, com visual mais adequado para apresentacao do TCC.

As interfaces permitem visualizar:

- valor aprovado mensal;
- quantidade aprovada mensal;
- custo medio mensal;
- comparacao por grupo de procedimento;
- ranking de municípios por valor aprovado;
- ranking de municípios por quantidade aprovada;
- custo medio municipal;
- crescimento municipal pós-pandemia versus pré-pandemia;
- comparacao real x previsto;
- previsao mensal inicial para os 12 meses seguintes ao ultimo dado disponivel.

## Observacao metodologica

A modelagem atual e uma etapa inicial e usa modelos simples, transparentes e adequados para uma primeira analise academica. Na escrita do TCC, as previsoes devem ser apresentadas como apoio exploratorio a gestao, nao como estimativas deterministicas do gasto futuro.

