# legado/

Arquivos aposentados na remodelação v2, em 2026-09-15. **Nada foi apagado** — tudo foi movido com `git mv`, então o histórico está preservado e qualquer arquivo pode voltar.

Nenhum destes alimenta o pipeline atual, o validador ou o site. Foi conferido, um por um, que as únicas referências a eles partiam de outros arquivos desta mesma pasta.

## Extração antiga do Ceará (2015–2023)

O estudo começou com recorte no Ceará e depois migrou para o Brasil. Esta é a base do recorte antigo.

| Arquivo | O que é |
|---|---|
| `dados_brutos/sia_cnv_qace094212177_19_126_92.csv` | Valor aprovado por ano/mês, Ceará, por local de atendimento |
| `dados_brutos/sia_cnv_qace094359177_19_126_92.csv` | Quantidade por município e **ano de processamento**, Ceará |
| `dados_brutos/sia_cnv_qace094828177_19_126_92.csv` | Valor por procedimento e ano de processamento, Ceará |
| `scripts/tratamento_dialise.py` | Script que lia os três acima |
| `dados_tratados/procedimentos_dialise_filtrados.csv` | Saída do script acima |
| `dados_tratados/resultado_dialise_anual.csv` | Idem |
| `dados_tratados/previsao_dialise_2024_2026.csv` | Idem |

> **Atenção ao usar `procedimentos_dialise_filtrados.csv` como prova de escopo.** Ele lista 14 procedimentos, mas é a lista da extração **do Ceará, 2015–2023**. O recorte nacional vigente tem **24 procedimentos** e está registrado na terceira linha do cabeçalho de cada arquivo de `dados_brutos/*_dialise_brasil.csv`. A lista nacional completa está transcrita em `docs/RECORTE-SIGTAP.md`.
>
> Estes dois arquivos também usam **ano de processamento**, enquanto a base nacional usa **ano de atendimento**. Não são comparáveis.

## Protótipo Streamlit

`dashboard/app.py` e `dashboard/README.md`. O produto principal passou a ser a interface web; o Streamlit ficou como protótipo. Lia os CSVs sem o sufixo `_corrigido`, que também estão aqui.

## Notebook exploratório

`analise.ipynb`. Substituído pelos scripts de `scripts/`.

## Saídas superadas pela rodada "corrigida"

O `scripts/modelagem_preditiva.py` grava tudo com o sufixo `_corrigido`. Os pares sem o sufixo são de uma rodada anterior e não são mais regenerados.

`metricas_modelos_preditivos.csv` · `metricas_modelos_backtest_temporal.csv` · `comparacao_real_previsto_2022_atual.csv` · `previsao_mensal_proximos_12m.csv` · `comparacao_real_previsto_2022_2023.csv`

Os dois `metricas_modelos_holdout_2022_atual*.csv` não são produzidos por nenhum script atual — nem com o sufixo `_corrigido`.
