# DialisaSUS - analise temporal, territorial e preditiva dos procedimentos de dialise no SUS

Este repositorio reune os arquivos do TCC sobre analise dos procedimentos de dialise aprovados no SUS, com foco em evolucao temporal, distribuicao territorial, impacto pre e pos-pandemia e previsao exploratoria para apoio a gestao em saude.

## Tema

Analise temporal, territorial e preditiva dos procedimentos de dialise no SUS: desenvolvimento da plataforma web DialisaSUS para apoio a gestao em saude.

## Recorte do estudo

- Abrangencia geografica: Brasil.
- Fontes dos dados: SIA/SUS - DATASUS/TabNet e IBGE/SIDRA.
- Periodo principal: janeiro de 2015 a junho de 2026, com 2026 tratado como ano parcial.
- Recorte territorial comparavel: 2015 a 2025, somente anos completos.
- Unidade de analise: procedimentos aprovados, nao pacientes unicos.
- Variaveis principais: valor aprovado nominal e real, quantidade aprovada, custo medio, populacao e taxas populacionais.
- Objeto: procedimentos relacionados a dialise no SUS.

## Objetivo geral

Desenvolver um prototipo web para analisar a evolucao temporal, territorial e preditiva dos procedimentos de dialise aprovados no SUS, apoiando a leitura sobre pressao assistencial, custos publicos e planejamento em saude.

## Estrutura do projeto

```text
.
├── dashboard/
│   ├── app.py
│   └── README.md
├── netlify/
│   └── functions/
│       └── agent.mjs
├── netlify.toml
├── tests/
│   └── netlify_agent.test.mjs
├── scripts/
│   └── build_netlify.mjs
├── web_dashboard/
│   ├── app.js
│   ├── assets/
│   ├── index.html
│   ├── README.md
│   └── styles.css
├── dados_brutos/
│   ├── qtd_mensal_dialise_brasil.csv
│   ├── qtd_municipio_dialise_brasil.csv
│   ├── valor_mensal_dialise_brasil.csv
│   ├── valor_municipio_dialise_brasil.csv
│   └── atualizacao_2026_05_06_*.csv
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
│   ├── dicionario_dados.md
│   ├── limitacoes.md
│   ├── relatorio_analise_tcc_dialise.md
│   └── resultados_exploratorios.md
├── scripts/
│   ├── analise_exploratoria.py
│   ├── modelagem_preditiva.py
│   ├── tratamento_municipio_dialise.py
│   ├── tratamento_dialise.py
│   ├── tratamento_mensal_dialise.py
│   ├── integrar_ibge.py
│   └── validar_dados.py
├── tests/
│   └── test_data_quality.py
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

5. Integrar populacao municipal e IPCA do IBGE:

```bash
python scripts/integrar_ibge.py
```

6. Rodar a modelagem preditiva:

```bash
python scripts/modelagem_preditiva.py
```

7. Validar automaticamente todos os produtos de dados:

```bash
python scripts/validar_dados.py
python -m unittest discover -s tests
```

8. Opcional: abrir o dashboard Streamlit legado:

```bash
streamlit run dashboard/app.py
```

9. Abrir o dashboard web customizado:

```powershell
.\.venv\Scripts\python.exe -m http.server 8080
```

Depois acesse:

```text
http://localhost:8080/web_dashboard/
```

10. Opcional: testar o backend serverless do agente:

```powershell
node --test tests\netlify_agent.test.mjs
npx netlify dev
```

O agente usa uma Netlify Function no caminho `/api/agent` e chama a
Interactions API do Gemini. No painel do Netlify, configure
`GEMINI_API_KEY` em **Project configuration > Environment variables** e
faça um novo deploy. Opcionalmente, configure `GEMINI_MODEL`; o padrão é
`gemini-3.6-flash`. A chave nunca deve ser escrita no frontend, no
`netlify.toml` ou enviada ao GitHub. Sem chave, a Function responde apenas
no modo de demonstração.

Para testar com o Netlify CLI, copie `.env.example` para `.env`,
preencha a chave somente no arquivo `.env` ignorado pelo Git e abra
`http://localhost:8888/web_dashboard/`.

## Resultados iniciais

- Periodo analisado: 138 meses, de janeiro de 2015 a junho de 2026.
- Valor aprovado total no periodo: aproximadamente R$ 40,03 bilhoes.
- Crescimento do valor aprovado entre 2015 e 2025, ultimo ano fechado: aproximadamente 88,61%.
- Unidade de analise: procedimentos aprovados, nao pacientes unicos.
- Modelo de aprendizagem selecionado: Gradient Boosting.
- MAPE medio em 43 janelas moveis de 12 meses: aproximadamente 5,35%.
- Desvio-padrao do MAPE entre janelas: aproximadamente 2,82 pontos percentuais.
- Previsao exploratoria: julho de 2026 a junho de 2027, a partir do ultimo mes real disponivel.

## Dashboards

O produto principal e a interface web customizada em HTML/CSS/JS. A versao Streamlit permanece apenas como prototipo legado.

As interfaces permitem visualizar:

- valor aprovado mensal;
- quantidade aprovada mensal;
- custo medio mensal;
- valor e custo medio corrigidos pelo IPCA para reais de junho de 2026;
- comparacao por grupo de procedimento;
- ranking de municipios por valor aprovado;
- ranking de municipios por quantidade aprovada;
- filtros territoriais por regiao, UF e municipio;
- mapa do Brasil por UF;
- custo medio municipal;
- valor real por habitante e procedimentos por 100 mil habitantes;
- crescimento municipal pos-pandemia versus pre-pandemia;
- comparacao real x previsto;
- previsao mensal para os 12 meses seguintes ao ultimo dado disponivel;
- agente de IA demonstrativo para perguntas gerenciais sobre os indicadores carregados.

## Observacao metodologica

Foram testados Regressao Linear, Ridge, Random Forest e Gradient Boosting. A validacao usa 43 janelas temporais moveis: em cada uma, o modelo recebe somente os dados anteriores ao corte e projeta os 12 meses seguintes sem acessar valores reais intermediarios. O Gradient Boosting apresentou o menor MAPE medio. A previsao inclui uma faixa empirica de 95% derivada dos erros historicos por horizonte e deve ser apresentada como apoio exploratorio, nao como estimativa deterministica do gasto futuro.

## Triagem demonstrativa

A aba de triagem renal e um modulo educativo e demonstrativo. Ela combina categorias de TFG e albuminuria da matriz KDIGO, sem criar uma pontuacao ou probabilidade individual. Nao utiliza dados individuais do DATASUS, nao realiza diagnostico e nao substitui avaliacao profissional.

## Limites e definicoes

Os valores corrigidos usam o IPCA mensal, com junho de 2026 como data de referencia. As taxas municipais usam estimativas anuais do IBGE e o Censo Demografico 2022. Como a serie fornecida nao continha 2023, esse ano foi estimado por interpolacao geometrica entre 2022 e 2024. Consulte `docs/integracao_ibge.md`, `docs/dicionario_dados.md` e `docs/limitacoes.md` para formulas, definicoes e limites de interpretacao.
