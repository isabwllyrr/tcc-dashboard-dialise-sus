# Contrato do dossiê DialisaSUS

- **Versão do contrato:** 1.0.0
- **JSON Schema:** `dossie/schema.json`
- **Dialeto:** JSON Schema Draft 2020-12
- **Dono da emissão:** pipeline de dados
- **Consumidores:** páginas Astro, figuras, tabelas gêmeas e assistente

## 1. Finalidade e fronteira

O dossiê é a única interface de dados do produto. Componentes não leem CSV diretamente e não recebem números literais. Cada número publicado deve percorrer a cadeia:

```text
CSV de origem → script declarado → dossiê validado → rota dona
```

A unidade observada é **procedimento aprovado por local de atendimento**, nunca pessoa ou paciente. Uma pessoa pode realizar várias sessões. O dossiê não mistura SIA/SUS com Censo SBN e não converte procedimentos em pessoas.

O contrato materializa o §3.5 de `docs/PLANO-V3-CONCEITO-C.md`. Ele define formas e fontes; a emissão dos JSONs de dados pertence à Onda 2. O arquivo `schema.json` já é executável e barra campos extras, valores sem estado, taxas sem denominador e documentos de tipo desconhecido.

## 2. Arquivos canônicos

```text
dossie/
  schema.json
  manifesto.json
  nacional.json
  modelo.json
  glossario.json
  ressalvas.json
  territorio/
    indice.json
    uf-<UF>.json
    distribuicao.json
```

Cada documento contém `tipo_documento` e `metadados`. Os valores aceitos de `tipo_documento` discriminam as oito formas do Schema:

| Arquivo | `tipo_documento` | Conteúdo |
|---|---|---|
| `manifesto.json` | `manifesto` | versão, extração, hashes, cobertura, fontes e recorte |
| `nacional.json` | `nacional` | G1, G2 e G3 |
| `territorio/indice.json` | `territorio_indice` | 27 UFs, anos e dados de G4 |
| `territorio/uf-<UF>.json` | `territorio_uf` | série e municípios de uma UF para G4/G5 |
| `territorio/distribuicao.json` | `territorio_distribuicao` | distribuição de trajetórias e estatísticas territoriais de G7 |
| `modelo.json` | `modelo` | protocolo, comparação e viés por horizonte de G6; previsão separada e opcional |
| `glossario.json` | `glossario` | termos fixos usados também pelo assistente |
| `ressalvas.json` | `ressalvas` | ressalvas canônicas ligadas a rotas e figuras |

## 3. Tipos transversais

### 3.1 Estados

Todo **valor estatístico** carrega exatamente um destes estados:

| Estado | Semântica | Regra de valor |
|---|---|---|
| `observado` | medido e consolidado | `valor` numérico |
| `provisorio` | medido, sujeito a revisão | `valor` numérico; mai e jun/2026 permanecem sem correção automática |
| `estimado` | modelo, interpolação ou estimativa | `valor` numérico |
| `sem_registro` | TabNet trouxe `-` no recorte | `valor: null`; não entra em variação |
| `ausente` | período não existe na extração | `valor: null`; lacuna, não zero |

O estado do numerador não absorve o estado do denominador. Uma taxa com numerador observado e população estimada continua com `estado: "observado"`, enquanto `denominador.estado` registra `estimado`.

### 3.2 Origem

Todo valor estatístico exige o objeto abaixo:

```json
{
  "arquivos_csv": ["dados_tratados/arquivo.csv"],
  "colunas": ["coluna_1", "coluna_2"],
  "script": "scripts/script_produtor.py",
  "transformacao": "descrição reproduzível do cálculo"
}
```

| Chave | Tipo | Unidade | Estado | Origem |
|---|---|---|---|---|
| `arquivos_csv` | array de strings não vazio | não se aplica | não se aplica | caminhos do(s) CSV(s) lidos |
| `colunas` | array de strings não vazio | não se aplica | não se aplica | nomes literais das colunas usadas |
| `script` | string não vazia | não se aplica | não se aplica | caminho do produtor responsável |
| `transformacao` | string não vazia | não se aplica | não se aplica | fórmula, agregação ou cópia aplicada |

Metadados, identificadores e texto editorial não são medidas; por isso unidade e estado são **não se aplica**. Sua procedência textual ou estrutural é declarada nas tabelas específicas abaixo.

### 3.3 Ponto de série

Forma canônica do plano, estendida somente pela origem obrigatória:

```json
{
  "periodo": "2025",
  "valor": 44444,
  "estado": "observado",
  "unidade": "procedimentos",
  "origem": {
    "arquivos_csv": ["dados_tratados/municipio_dialise_brasil_long.csv"],
    "colunas": ["ano", "qtd_aprovada", "estado_registro"],
    "script": "scripts/gerar_dossie.py",
    "transformacao": "seleção do município e do ano, sem conversão de unidade"
  }
}
```

| Chave | Tipo | Unidade | Estado | Origem |
|---|---|---|---|---|
| `periodo` | string | calendário (`AAAA`, `AAAA-MM` ou intervalo nomeado) | não se aplica | coluna temporal declarada em `origem.colunas` |
| `valor` | número ou `null` | indicada em `unidade` | obrigatório | colunas e transformação em `origem` |
| `estado` | enum de cinco valores | não se aplica | é o próprio estado | `estado_registro`, regra de provisório ou natureza da estimativa |
| `unidade` | string não vazia | é a própria unidade | não se aplica | contrato da métrica |
| `origem` | objeto `Origem` | não se aplica | não se aplica | rota completa ao produtor |

`serie`, `metrica`, `modelo`, `alvo` e `horizonte_meses` são extensões tipadas usadas, respectivamente, para distinguir nominal/real, G2 e G6. Não alteram a forma mínima.

### 3.4 Taxa

Forma canônica do plano, com origem do numerador e do denominador:

```json
{
  "periodo": "2025",
  "valor": 19141.0,
  "estado": "observado",
  "unidade": "procedimentos por 100 mil habitantes",
  "origem": {
    "arquivos_csv": ["dados_tratados/municipio_dialise_brasil_long.csv"],
    "colunas": ["qtd_aprovada", "populacao", "qtd_por_100_mil_habitantes"],
    "script": "scripts/integrar_ibge.py",
    "transformacao": "qtd_aprovada / populacao × 100000"
  },
  "denominador": {
    "valor": 203080000,
    "estado": "estimado",
    "unidade": "habitantes",
    "fonte": "IBGE Tabela 6579 — estimativa 2025",
    "origem": {
      "arquivos_csv": ["dados_tratados/populacao_municipio_2015_2025.csv"],
      "colunas": ["ano", "populacao", "fonte_populacao"],
      "script": "scripts/integrar_ibge.py",
      "transformacao": "seleção da população do mesmo território e período"
    }
  },
  "quebra_denominador": false
}
```

| Chave adicional | Tipo | Unidade | Estado | Origem |
|---|---|---|---|---|
| `denominador.valor` | número positivo | habitantes | em `denominador.estado` | IBGE, mesma geografia e período do numerador |
| `denominador.estado` | enum | não se aplica | `observado` no Censo 2022; `estimado` nos demais anos, inclusive interpolação de 2023 | `fonte_populacao` |
| `denominador.unidade` | literal `habitantes` | habitantes | não se aplica | contrato |
| `denominador.fonte` | string | não se aplica | não se aplica | `fonte_populacao` |
| `denominador.origem` | objeto `Origem` | não se aplica | não se aplica | CSV e script do IBGE |
| `quebra_denominador` | booleano | não se aplica | não se aplica | `true` em 2022, quando a base passa de estimativa para Censo |

Se o numerador estiver `sem_registro` ou `ausente`, `valor` e `denominador` são `null`; não se fabrica taxa. Estatísticas de uma distribuição de taxas usam `procedencia_denominadores`, pois não têm um único denominador: registram a fonte e a regra aplicada a todas as populações municipais.

### 3.5 Achado

O texto de `figcaption` vem do dossiê na forma canônica:

```json
{
  "id": "G2.achado",
  "texto": "Texto aprovado derivado dos valores referenciados.",
  "valores": [
    {
      "chave": "variacao_valor_real_por_procedimento",
      "valor": -13.74,
      "unidade": "%",
      "estado": "observado",
      "origem": {
        "arquivos_csv": ["dados_tratados/indicadores_anuais_brasil.csv"],
        "colunas": ["valor_aprovado_real", "qtd_aprovada", "ano"],
        "script": "scripts/gerar_dossie.py",
        "transformacao": "razão de somas por período e variação percentual"
      }
    }
  ],
  "ressalvas": ["r.mix", "r.procedimento_nao_pessoa"],
  "periodos": { "pre": "2015–2019", "pos": "2022–2025" }
}
```

`texto` é conteúdo editorial aprovado; seus números devem corresponder a `valores`. O pipeline valida essa correspondência antes de emitir. `ressalvas` contém apenas IDs existentes em `ressalvas.json`.

## 4. Catálogo de origens

Esta tabela fixa nomes de CSV e coluna. Os artefatos das Ondas 1.2 e 2.1 são materializados pelos scripts indicados e validados em conjunto.

| ID | CSV e colunas | Script produtor | Unidade / estado |
|---|---|---|---|
| `src.nacional_mensal` | `dados_tratados/dialise_mensal_brasil_total.csv`: `data`, `ano`, `mes`, `valor_aprovado`, `qtd_aprovada`, `custo_medio`, `provisorio`, `valor_aprovado_real`, `custo_medio_real` | `scripts/tratamento_mensal_dialise.py` + `scripts/integrar_ibge.py` | reais, reais de jun/2026, procedimentos; `provisorio` somente mai–jun/2026 |
| `src.nacional_anual` | `dados_tratados/dialise_anual_brasil_total.csv` e `dados_tratados/indicadores_anuais_brasil.csv`: `ano`, `valor_aprovado`, `qtd_aprovada`, `meses_disponiveis`, `ano_completo` e colunas reais | scripts de tratamento e `scripts/analise_exploratoria.py` | 2015–2025 observado; 2026 parcial não entra em comparação territorial |
| `src.municipio` | `dados_tratados/municipio_dialise_brasil_long.csv`: `cod_municipio`, `cod_ibge`, `municipio`, `uf_ibge`, `ano`, `valor_aprovado`, `qtd_aprovada`, `estado_registro`, `populacao`, `fonte_populacao`, `valor_aprovado_real`, `qtd_por_100_mil_habitantes`, `valor_por_habitante_real` | `scripts/tratamento_municipio_dialise.py` + `scripts/integrar_ibge.py` | município-ano; cinco estados preservados |
| `src.uf` | `dados_tratados/dialise_uf_total_anual.csv`: `uf`, `ano`, `qtd_aprovada`, `valor_aprovado_nominal`, `valor_aprovado_real`, `populacao`, `taxa_qtd_100k`, `valor_real_per_capita` | `scripts/agregacao_territorial.py` | somas por UF e taxas por razão de somas; somente 2015–2025; 27 UFs reconciliadas ao nacional |
| `src.trajetorias` | `dados_tratados/distribuicao_trajetorias_municipais.csv`: `registro_tipo`, `faixa`, `ordem`, `limite_inferior_pct`, `limite_superior_pct`, `municipios`, `percentual_validos`, `periodo_inicio`, `periodo_fim`, `metrica`, `incluido_na_distribuicao`, `motivo_exclusao` | `scripts/agregacao_territorial.py` | variação do valor real municipal 2015–2025; `sem_registro`/`ausente` nos extremos ficam fora das faixas e são reportados como exclusões |
| `src.populacao` | `dados_tratados/populacao_municipio_2015_2025.csv`: `cod_ibge`, `cod_municipio`, `uf`, `ano`, `populacao`, `fonte_populacao` | `scripts/integrar_ibge.py` | habitantes; Censo 2022 observado, demais estimados, 2023 interpolado |
| `src.ipca` | `dados_tratados/ipca_mensal_2015_2026_06.csv`: `data`, `ipca_indice`, `fator_correcao_jun_2026` | `scripts/integrar_ibge.py` | índice e fator; base em jun/2026 |
| `src.modelo_resumo` | `dados_tratados/evidencia_modelos_resumo.csv`: `alvo`, `escala`, `modelo`, `tipo`, `MAE`, `RMSE`, `MAPE_pct`, `MAPE_desvio_pct`, `MAPE_mediana_pct`, `MASE`, `vies_pct`, `recortes`, `ajustes_nao_convergentes` | `scripts/modelagem_preditiva.py` | %, escala MASE e contagem de janelas; estimado |
| `src.modelo_horizonte` | `dados_tratados/evidencia_modelos_horizonte.csv`: `alvo`, `escala`, `modelo`, `tipo`, `horizonte`, `observacoes`, `MAE`, `RMSE`, `MAPE_pct`, `vies_pct`; auditoria linha a linha em `evidencia_modelos_detalhado.csv` | `scripts/modelagem_preditiva.py` | reais e % por horizonte; estimado para previsão, observado para realizado |
| `src.previsao` | `dados_tratados/previsao_mensal_proximos_12m_corrigido.csv`: `data`, `modelo_usado`, `previsao_valor_aprovado`, `limite_inferior_95`, `limite_superior_95` | `scripts/modelagem_preditiva.py` | reais; estimado |
| `src.geo` | `web_dashboard/assets/brazil-states.geojson`: geometria e sigla/nome | gerador Astro/emitidor do dossiê | geometria; não é medida estatística |

Os nomes destes CSVs são parte do contrato. Qualquer mudança de nome ou coluna exige alteração conjunta deste documento, do gerador e das validações; consumidor nenhum adivinha aliases.

## 5. Dicionário por documento

### 5.1 Chaves comuns

| Caminho | Tipo | Unidade | Estado | Origem |
|---|---|---|---|---|
| `tipo_documento` | literal enum | não se aplica | não se aplica | estrutura deste contrato |
| `metadados.gerado_em` | string `date-time` | horário de Brasília com offset explícito | não se aplica | relógio do pipeline em `scripts/gerar_dossie.py` |
| `metadados.vintage` | string `date` | data | não se aplica | diretório `dados_brutos/vintages/<data>/` |
| `metadados.schema_version` | semver string | não se aplica | não se aplica | versão deste contrato |

### 5.2 `manifesto.json`

| Caminho | Tipo | Unidade | Estado | Origem |
|---|---|---|---|---|
| `versao_dossie` | semver string | não se aplica | não se aplica | versão de emissão em `scripts/gerar_dossie.py` |
| `extracao.data`, `extracao.vintage` | strings `date` | data | não se aplica | manifesto do vintage |
| `extracao.arquivos[].caminho` | string | não se aplica | não se aplica | arquivos efetivamente lidos |
| `extracao.arquivos[].sha256` | string hexadecimal de 64 caracteres | não se aplica | não se aplica | hash SHA-256 calculado pelo emitidor |
| `cobertura.temporal` | string | período | não se aplica | mínimo/máximo das colunas temporais |
| `cobertura.territorial` | string | geografia | não se aplica | metadados TabNet: local de atendimento |
| `cobertura.unidade_observacao` | literal | procedimentos aprovados por local de atendimento | não se aplica | metadados TabNet e decisão do projeto |
| `fontes[]` | array de objetos | não se aplica | não se aplica | `SOURCES.md` + caminhos lidos |
| `escopo.procedimentos_sigtap[]` | array de códigos com 10 dígitos | códigos | não se aplica | cabeçalho `Procedimento:` das extrações e `docs/RECORTE-SIGTAP.md` |
| `escopo.questoes_abertas[]` | array de strings | não se aplica | não se aplica | Gate G-A: DPAC/DPA e CICLODIALISE |
| `escopo.ano_parcial` | inteiro literal `2026` | ano | não se aplica | cobertura da extração |

### 5.3 `nacional.json`

| Caminho | Tipo | Unidade | Estado | Origem |
|---|---|---|---|---|
| `series.g1_valor_anual[]` | `PontoMonetario` | reais nominais ou reais de jun/2026 | observado | `src.nacional_anual`; `serie` distingue `nominal`/`real` |
| `series.g2_medias_periodo[]` | `PontoComparativo` | procedimentos, reais de jun/2026, reais por procedimento ou % | observado | razão de somas/agregação por período sobre `src.nacional_anual` |
| `series.g3_quantidade_mensal[]` | `PontoSerie` | procedimentos | observado/provisório | `src.nacional_mensal.qtd_aprovada` + `provisorio` |
| `series.g3_media_movel_12m[]` | `PontoSerie` opcional | procedimentos | estimado | média móvel de `qtd_aprovada`, se emitida por `scripts/gerar_dossie.py` |
| `series.g3_tendencia[]` | `PontoSerie` opcional | procedimentos | estimado | tendência definida pelo método aprovado, nunca inferida no componente |
| `achados[]` | array de `Achado` | conforme `valores[].unidade` | em cada valor | mesmas séries; texto aprovado e IDs de ressalva |

### 5.4 `territorio/indice.json`

| Caminho | Tipo | Unidade | Estado | Origem |
|---|---|---|---|---|
| `ano_corrente` | inteiro 2015–2025 | ano | não se aplica | último ano completo escolhido pelo emitidor |
| `ufs[]` | 27 objetos `sigla`, `nome`, `rota` | não se aplica | não se aplica | lista IBGE + rotas Astro |
| `mapa_por_ano[].periodo` | string `AAAA` | ano | não se aplica | `src.uf.ano` |
| `mapa_por_ano[].uf` | sigla de duas letras | UF | não se aplica | `src.uf.uf` |
| `mapa_por_ano[].quantidade` | `PontoSerie` | procedimentos | cinco estados | `src.uf.qtd_aprovada` |
| `mapa_por_ano[].taxa_100_mil` | `PontoTaxa` | procedimentos por 100 mil habitantes | numerador + estado próprio do denominador | `src.uf.taxa_qtd_100k`; população em `src.populacao` |
| `metadados_mapa.geometria` | string | não se aplica | não se aplica | `src.geo` |
| `metadados_mapa.classes_maximas` | inteiro de 2 a 7 | classes | não se aplica | limite visual do plano |
| `metadados_mapa.origem` | `Origem` | não se aplica | não se aplica | caminho e gerador da geometria |
| `achados[]` | array de `Achado` | conforme valores | em cada valor | `src.uf` |

### 5.5 `territorio/uf-<UF>.json`

| Caminho | Tipo | Unidade | Estado | Origem |
|---|---|---|---|---|
| `uf.sigla`, `uf.nome` | strings | UF | não se aplica | lista IBGE materializada em `src.uf` |
| `serie_valor_anual[]` | `PontoMonetario` | reais nominais ou reais de jun/2026 | observado | `src.uf.valor_aprovado_nominal` e `valor_aprovado_real` |
| `municipios_por_ano[].periodo` | string `AAAA` | ano | não se aplica | `src.municipio.ano` |
| `municipios_por_ano[].cod_ibge` | string de 7 dígitos | código IBGE | não se aplica | `src.municipio.cod_ibge` |
| `municipios_por_ano[].nome` | string | não se aplica | não se aplica | `src.municipio.municipio` |
| `municipios_por_ano[].quantidade` | `PontoSerie` | procedimentos | cinco estados | `src.municipio.qtd_aprovada` + `estado_registro` |
| `municipios_por_ano[].taxa_100_mil` | `PontoTaxa` | procedimentos por 100 mil habitantes | numerador + denominador | `src.municipio.qtd_por_100_mil_habitantes` + `src.populacao` |
| `municipios_por_ano[].valor_real_por_habitante` | `PontoTaxa` | reais de jun/2026 por habitante | numerador + denominador | `src.municipio.valor_por_habitante_real` + `src.populacao` |
| `achados[]` | array de `Achado` | conforme valores | em cada valor | séries da própria UF |

### 5.6 `territorio/distribuicao.json`

| Caminho | Tipo | Unidade | Estado | Origem |
|---|---|---|---|---|
| `periodos.inicio`, `periodos.fim` | inteiros literais 2015 e 2025 | ano | não se aplica | recorte territorial aprovado |
| `trajetorias[].categoria` | enum | não se aplica | não se aplica | classificação de `src.trajetorias` |
| `trajetorias[].municipios` | `MedidaEscalar` | municípios | observado | contagem em `src.trajetorias`; pares inválidos vão a `excluido` |
| `estatisticas_taxa[].chave` | enum `p25`, `mediana`, `p75`, `maximo`, `acima_3x_mediana` | não se aplica | não se aplica | estatística materializada em `src.trajetorias` |
| `estatisticas_taxa[].periodo` | string `AAAA` | ano | não se aplica | ano da distribuição |
| `estatisticas_taxa[].valor` | número | unidade em `unidade` | em `estado` | `src.trajetorias` |
| `estatisticas_taxa[].estado` | enum | não se aplica | observado/estimado conforme cálculo | natureza da estatística |
| `estatisticas_taxa[].unidade` | string | taxa ou municípios | não se aplica | contrato da estatística |
| `estatisticas_taxa[].origem` | `Origem` | não se aplica | não se aplica | CSV agregado + colunas |
| `estatisticas_taxa[].procedencia_denominadores` | objeto `fonte`, `regra`, `origem` | habitantes | estado descrito nas populações componentes | populações municipais de `src.populacao` |
| `achados[]` | array de `Achado` | conforme valores | em cada valor | `src.trajetorias` |

### 5.7 `modelo.json`

| Caminho | Tipo | Unidade | Estado | Origem |
|---|---|---|---|---|
| `protocolo.frequencia` | literal `mensal` | mês | não se aplica | especificação da Onda 1.3 |
| `protocolo.horizonte_meses` | inteiro literal 12 | meses | não se aplica | `scripts/modelagem_preditiva.py` |
| `protocolo.baseline` | literal `sazonal_ingenuo` | não se aplica | não se aplica | protocolo aprovado |
| `protocolo.origem_previsao` | string `AAAA-MM` | mês | não se aplica | data máxima do conjunto de treino |
| `protocolo.meses_provisorios_na_origem` | booleano | não se aplica | não se aplica | cruzamento com `src.nacional_mensal.provisorio` |
| `comparacao_modelos[].modelo` | string | não se aplica | não se aplica | `src.modelo_resumo.modelo` |
| `comparacao_modelos[].alvo` | enum nominal/real | reais | não se aplica | coluna `alvo` exigida pela Onda 1.3 |
| `comparacao_modelos[].janelas` | inteiro | janelas | não se aplica | `src.modelo_resumo.recortes` |
| `comparacao_modelos[].metricas.mape_medio` | `MedidaEscalar` | % | estimado | MAPE médio de `src.modelo_resumo` |
| `comparacao_modelos[].metricas.mape_mediano` | `MedidaEscalar` | % | estimado | MAPE mediano de `src.modelo_resumo` |
| `comparacao_modelos[].metricas.mase` | `MedidaEscalar` | razão adimensional | estimado | MASE contra sazonal ingênuo; Onda 1.3 |
| `comparacao_modelos[].metricas.vies` | `MedidaEscalar` | % | estimado | `src.modelo_resumo.vies_pct` |
| `vies_por_horizonte[]` | `PontoSerie` estendido | % | estimado | agrupamento de `src.modelo_horizonte.residuo` por modelo/alvo/horizonte |
| `previsao_12m[]` | 12 `PontoPrevisao`, opcional | reais | estimado | `src.previsao`; não alimenta G6 como curva de gasto futuro |
| `achados[]` | array de `Achado` | conforme valores | em cada valor | comparação e viés |

### 5.8 `glossario.json` e `ressalvas.json`

| Caminho | Tipo | Unidade | Estado | Origem |
|---|---|---|---|---|
| `versao`, `data`, `fonte` | strings | versão/data/não se aplica | não se aplica | emissão e fonte editorial do documento |
| `termos[].termo`, `termos[].slug`, `termos[].definicao` | strings | não se aplica | não se aplica | texto aprovado pela autora via `fonte` |
| `termos[].fonte` | string | não se aplica | não se aplica | caminho e seção da fonte textual |
| `termos[].uso_na_interface`, `termos[].obs` | strings | não se aplica | não se aplica | especificação editorial do Verbete |
| `ressalvas[].id` | string `r.*` | não se aplica | não se aplica | catálogo canônico do plano §8 |
| `ressalvas[].texto`, `ressalvas[].fonte`, `ressalvas[].contexto` | strings | não se aplica | não se aplica | texto aprovado, sua procedência e consumidores descritos |
| `ressalvas[].obrigatoria` | booleano | não se aplica | não se aplica | regra editorial do catálogo canônico |

## 6. Cobertura do inventário de figuras

| Figura | Série exigida | Chave contratada | Arquivo dono | Cobertura |
|---|---|---|---|---|
| G1 | valor nacional anual nominal e real, 2015–2025 | `series.g1_valor_anual[]` com `serie` | `nacional.json` | completa |
| G2 | médias pré/pós de valor real por procedimento e variação de quantidade | `series.g2_medias_periodo[]` com `metrica` | `nacional.json` | completa |
| G3 | quantidade mensal jan/2015–jun/2026, com provisórios; média móvel/tendência se usadas | `series.g3_quantidade_mensal[]`, opcionais `g3_media_movel_12m[]` e `g3_tendencia[]` | `nacional.json` | completa |
| G4 | quantidade/taxa por UF em um ano e tabela municipal | `mapa_por_ano[]`; `municipios_por_ano[]` | `territorio/indice.json` + `uf-<UF>.json` | completa |
| G5 | valor anual nominal e real da UF | `serie_valor_anual[]` | `territorio/uf-<UF>.json` | completa |
| G6 | comparação de modelos e viés por horizonte, com alvo explícito | `comparacao_modelos[]`; `vies_por_horizonte[]` | `modelo.json` | completa; previsão fica separada |
| G7, se aprovada | categorias de trajetória 2015–2025, exclusões e distribuição de taxas | `trajetorias[]`; `estatisticas_taxa[]` | `territorio/distribuicao.json` | completa; também serve texto+tabela se o gráfico for recusado |

Assim, nenhuma figura do inventário exige série ausente do contrato. G7 permanece gate editorial, não lacuna de dados: o contrato a suporta sem presumir sua publicação como figura.

## 7. Regras de emissão e invariantes

1. `additionalProperties: false` em todas as formas fechadas: mudança de chave exige mudança de contrato.
2. `sem_registro` e `ausente` exigem `valor: null`; os outros estados exigem número.
3. Variação não é calculada se qualquer ponta for `sem_registro` ou `ausente`.
4. Taxa direta exige `denominador`; estado e fonte populacional permanecem dentro dele.
5. Em 2022, `quebra_denominador: true`; a interface mostra a troca para Censo.
6. População de 2023 é `estimado`, com fonte “interpolação geométrica entre IBGE 2022 e 2024”.
7. Valor real usa `fator_correcao_jun_2026`; o componente não deflaciona.
8. Médias monetárias por procedimento são razão de somas, nunca média de médias.
9. Território usa apenas 2015–2025. O ano parcial de 2026 não entra em G4, G5 ou G7.
10. Mai e jun/2026 permanecem `provisorio`, sem correção automática.
11. `Achado.texto` não autoriza conclusão nova: copy e números devem ser aprovados e reconciliados.
12. `0405050054 CICLODIALISE` permanece no escopo atual e DPAC/DPA permanecem fora até decisão da autora/orientador; o manifesto registra ambas as questões.

## 8. Validação por máquina

O validador confere o próprio Schema com `Draft202012Validator.check_schema` e, quando os documentos forem emitidos, valida todo `dossie/**/*.json` exceto `schema.json`:

```powershell
npm run check:dossie
```

Saída esperada nesta onda:

```text
Schema Draft 2020-12 válido: dossie/schema.json
Documentos do dossiê validados: 0
```

Zero documentos de dados é esperado antes da Onda 2.1; não significa zero observações. O comando passa porque o contrato formal existe e é válido. A partir da emissão, qualquer documento inválido faz o processo sair com código diferente de zero e informa caminho JSON do erro.

## 9. Questões de método que o contrato não decide

- entrada ou não de DPAC/DPA;
- retirada ou não de `0405050054 CICLODIALISE`;
- origem da previsão em abril/2026 consolidado ou junho/2026 provisório;
- eventual mudança do modelo após baselines;
- publicação de G7 como figura ou somente texto+tabela.

Esses são gates da autora, do orientador e, no caso de G7, também do usuário. O Schema torna as alternativas explícitas; não corrige escopo em silêncio.

## 10. Base aplicada

VAULT: `00-SISTEMA/MEMORY_PROTOCOL.md` → contrato registra decisões duráveis e não transforma saídas de sessão em memória automática.
VAULT: `04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` → Vault consultado antes das decisões; rastreabilidade registrada nota a nota.
VAULT: `01-PROJETOS/DialisaSUS/DECISOES.md` → cinco estados preservados, unidade em procedimentos e stack/dossiê alinhados ao conceito C.
VAULT: `01-PROJETOS/DialisaSUS/ROADMAP.md` → Onda 1.1 define o contrato e mantém gates metodológicos abertos.
