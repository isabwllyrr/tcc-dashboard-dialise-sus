# DialisaSUS - dashboard web customizado

Versao web customizada do prototipo do TCC, criada com HTML, CSS e JavaScript puro. O painel apresenta analise temporal, territorial e preditiva dos procedimentos de dialise aprovados no SUS.

## Como abrir

Na raiz do projeto, rode um servidor local:

```powershell
.\.venv\Scripts\python.exe -m http.server 8080
```

Depois abra:

```text
http://localhost:8080/web_dashboard/
```

Essa versao usa os CSVs em `dados_tratados/` e nao depende do Streamlit.

## Observacao

Os indicadores representam procedimentos aprovados no SIA/SUS, nao pacientes unicos. A previsao e exploratoria e utiliza o modelo de aprendizagem supervisionada selecionado na etapa de validacao temporal.
