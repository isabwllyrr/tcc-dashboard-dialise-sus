# DialisaSUS - analise temporal, territorial e preditiva dos procedimentos de dialise no SUS

Este repositorio reune os arquivos do TCC sobre analise dos procedimentos de dialise aprovados no SUS, com foco em evolucao temporal, distribuicao territorial, impacto pre e pos-pandemia e previsao exploratoria para apoio a gestao em saude.

## Tema

Analise temporal, territorial e preditiva dos procedimentos de dialise no SUS: desenvolvimento da plataforma web DialisaSUS para apoio a gestao em saude.

## Recorte do estudo

- Abrangencia geografica: Brasil.
- Fonte dos dados: SIA/SUS - DATASUS/TabNet.
- Periodo principal: janeiro de 2015 a abril de 2026, com 2026 tratado como ano parcial.
- Unidade de analise: procedimentos aprovados, nao pacientes unicos.
- Variaveis principais: valor aprovado, quantidade aprovada e custo medio.
- Objeto: procedimentos relacionados a dialise no SUS.

## Objetivo geral

Desenvolver um prototipo web para analisar a evolucao temporal, territorial e preditiva dos procedimentos de dialise aprovados no SUS, apoiando a leitura sobre pressao assistencial, custos publicos e planejamento em saude.

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
│   ├── comparacao_real_previsto_2022_atual_corrigido.csv
│   ├── dialise_anual_brasil_total.csv
│   ├── dialise_mensal_brasil_por_grupo.csv
│   ├── dialise_mensal_brasil_total.csv
│   ├── indicadores_anuais_brasil.csv
│   ├── indicadores_grupo_brasil.csv
│   ├── indicadores_municipio_brasil.csv
│   ├── metricas_modelos_preditivos_corrigido.csv
│   ├── municipio_dialise_brasil_long.csv
│   ├── previsao_mensal_proximos_12m_corrigido.csv
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

4. Tratar a base territorial por municipio:

```bash
python scripts/tratamento_municipio_dialise.py
```

5. Rodar a modelagem preditiva:

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
- Unidade de analise: procedimentos aprovados, nao pacientes unicos.
- Modelo de aprendizagem selecionado: Ridge Regression.
- MAPE medio no backtesting temporal: aproximadamente 2,54%.
- Previsao exploratoria: maio de 2026 a abril de 2027, a partir do ultimo mes real disponivel.

## Dashboards

O projeto possui duas interfaces: uma versao inicial em Streamlit e uma versao web customizada em HTML/CSS/JS, com visual mais adequado para apresentacao do TCC.

As interfaces permitem visualizar:

- valor aprovado mensal;
- quantidade aprovada mensal;
- custo medio mensal;
- comparacao por grupo de procedimento;
- ranking de municipios por valor aprovado;
- ranking de municipios por quantidade aprovada;
- filtros territoriais por regiao, UF e municipio;
- mapa do Brasil por UF;
- custo medio municipal;
- crescimento municipal pos-pandemia versus pre-pandemia;
- comparacao real x previsto;
- previsao mensal para os 12 meses seguintes ao ultimo dado disponivel.

## Observacao metodologica

Foram testados modelos de aprendizagem supervisionada para previsao do valor aprovado mensal, com validacao temporal por backtesting. O modelo selecionado foi o Ridge Regression, por apresentar o menor MAPE medio entre os modelos de aprendizagem avaliados. As previsoes devem ser apresentadas como apoio exploratorio a gestao, nao como estimativas deterministicas do gasto futuro.

## Triagem demonstrativa

A aba de triagem renal e um modulo educativo e demonstrativo. Ela nao utiliza dados individuais do DATASUS, nao realiza diagnostico e nao substitui avaliacao profissional. No TCC, deve ser apresentada como possibilidade de expansao futura da plataforma.
