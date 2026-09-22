# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Antes de decidir: leia o AI-Vault

Regra soberana do usuário (`C:\Users\Antonio\AI-Vault\04-DECISOES-GLOBAIS\DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md`): consultar o Vault **antes** de decidir e registrar o que foi aplicado.

Ordem de leitura:
1. `C:\Users\Antonio\AI-Vault\00-SISTEMA\MEMORY_PROTOCOL.md`
2. `C:\Users\Antonio\AI-Vault\04-DECISOES-GLOBAIS\` (2 notas)
3. `C:\Users\Antonio\AI-Vault\01-PROJETOS\DialisaSUS\` — `ROADMAP.md` diz em que etapa o trabalho está; `CONTEXTO.md` traz o diagnóstico reconferido; `DECISOES.md`, o que já foi decidido e por quê; `TEXTO-GERAL-DO-PROJETO.md` é a **fonte da copy e dos números**.
4. Tema não coberto → `02-CONHECIMENTO\00-INDICE-CONHECIMENTO.md` antes de usar internet ou conhecimento próprio.

**Plano vigente:** `C:\Users\Antonio\.claude\plans\utilize-todas-essas-skills-breezy-iverson.md` (v3, delta) sobre `preciso-de-ajuda-para-staged-tiger.md` (v2, base). O v2 vale no que o v3 não revisa.

Toda entrega termina com linhas `VAULT: <nota> → <regra aplicada>`, uma por nota. Sem elas a entrega é incompleta.

## Regras do projeto que não se descobrem lendo o código

- **Unidade de análise: procedimentos aprovados, nunca pacientes.** Uma pessoa em hemodiálise faz várias sessões por mês. Não converter procedimentos em pessoas, e não misturar o Censo SBN (pacientes) com o SIA (procedimentos).
- **Gates humanos.** Nenhum número do TCC muda na narrativa sem aprovação da autora e do orientador; direção visual e copy também são gates. Deploy de preview só com autorização explícita do usuário.
- **O recorte vive no cabeçalho do TabNet**, não no código: a terceira linha de cada `dados_brutos/*_dialise_brasil.csv` lista os 24 procedimentos, e a primeira diz que tudo é por local de **atendimento**. Transcrito em `docs/RECORTE-SIGTAP.md` — regerar a cada extração nova, nunca editar à mão.
- **Questões de escopo se reportam, não se corrigem em silêncio.** As abertas: DPAC/DPA fora do recorte e `0405050054 CICLODIALISE` dentro dele.
- **2026 é ano parcial** (jan–jun) e os meses mais recentes são provisórios. O território comparável é 2015–2025, só anos completos.
- **Trabalho direto na `main`.** O usuário decidiu em 18/09/2026 não usar branches; `remodelacao-v2` foi mesclada por fast-forward e apagada. Commit continua sendo trabalho normal; **push e deploy só com autorização explícita** — o `origin` aponta para o repositório da autora (`isabwllyrr/tcc-dashboard-dialise-sus`), então publicar lá é ação externa.

## Comandos

```bash
pip install -r requirements.txt
```

Pipeline de dados, **nesta ordem** (cada passo consome a saída do anterior):

```bash
python scripts/tratamento_mensal_dialise.py     # TabNet -> serie mensal nacional + por grupo
python scripts/analise_exploratoria.py          # indicadores anuais, por grupo, docs/resultados_*
python scripts/tratamento_municipio_dialise.py  # TabNet -> base territorial anual por municipio
python scripts/integrar_ibge.py                 # populacao IBGE + IPCA, reescreve os CSVs no lugar
python scripts/modelagem_preditiva.py           # backtest, metricas, previsao 12m, docs/modelagem_preditiva.md
```

Validação e testes:

```bash
python scripts/validar_dados.py                 # ~30 asserts sobre os CSVs tratados; falha rapido
python -m unittest discover -s tests            # test_data_quality.py so invoca o validador acima
python -m unittest tests.test_data_quality      # um teste especifico
node --test tests/netlify_agent.test.mjs        # testes da Netlify Function do agente
```

Servir o dashboard e o agente:

```bash
npm run dev                                     # http://localhost:4321 (recarrega ao salvar)
npm run build                                   # gera dist/ como no deploy
npm run preview                                 # serve o dist/ ja compilado
npx netlify dev                                 # com a Function em /api/agent
```

`GEMINI_API_KEY` e `GEMINI_MODEL` vão em `.env` (ignorado pelo Git) ou nas variáveis do Netlify. Sem chave, a Function responde em `local_fallback`.

## Arquitetura

**Três camadas, acopladas por arquivos CSV — não há banco nem API de dados.**

1. **Pipeline Python** (`scripts/`) lê `dados_brutos/` e escreve `dados_tratados/`.
   - Os CSVs do TabNet vêm em `latin1`, separador `;`, números no formato brasileiro e com cabeçalho e rodapé de relatório. `tratamento_mensal_dialise.py` localiza a linha de cabeçalho procurando `"Ano/m"` e `"Total"`, e há um mapa de meses que inclui variantes de mojibake (`Mar�o`). Qualquer nova extração precisa passar por esse tratamento.
   - `integrar_ibge.py` é **idempotente por reescrita**: derruba as colunas derivadas e refaz o merge, gravando por cima de `dialise_mensal_brasil_total.csv`, `municipio_dialise_brasil_long.csv` e `indicadores_municipio_brasil.csv`. Rodar duas vezes é seguro; rodar antes do tratamento correspondente, não.
   - População: estimativas municipais do IBGE mais o Censo 2022, com **2023 interpolado geometricamente** entre 2022 e 2024 (o IBGE não publicou estimativa municipal em 2023). A coluna `fonte_populacao` carrega essa procedência linha a linha.
   - IPCA: fator de correção para **reais de junho de 2026** (fator 1,0 no último mês). Séries mensais usam o índice do mês; a base territorial, que é anual, usa a **média anual** do índice.
   - `modelagem_preditiva.py`: backtest em janelas móveis de 12 meses desde 2022-01, quatro modelos supervisionados, features só temporais (`indice_tempo`, `mes`, `mes_sin`, `mes_cos`). Escolhe o menor MAPE médio e gera a faixa de 95% pelo percentil 95 do erro absoluto **por horizonte**. Escreve os CSVs com sufixo `_corrigido`; os pares sem sufixo são de uma rodada anterior e permanecem no repositório.
2. **Front-end Astro** (`src/`): sete rotas estáticas mais 27 páginas de UF, geradas em `astro build`. Lê o **dossiê** (`dossie/*.json`), nunca os CSVs direto. Três ilhas de JavaScript, todas degradando sem JS: o rim 3D em `/`, o seletor de ano nas páginas de UF e o formulário do assistente. O GeoJSON do mapa fica em `src/data/brazil-states.geojson`.
3. **Netlify Function** (`netlify/functions/agent.mjs`): rota `/api/agent`, `GET` de health e `POST` de pergunta. Recusa perguntas clínicas por regra local antes de chamar o provedor, tem fallback sem chave, rate limit declarado em `export const config` e timeout de 25 s. O deploy roda `npm run build`; o `netlify.toml` inclui `dossie/**/*.json` na Function.

**O validador é o contrato entre as camadas.** `scripts/validar_dados.py` é onde estão escritas as invariantes reais do projeto: continuidade da série, mês-base do IPCA, `valor_real = nominal × fator`, soma dos grupos igual ao total (excluindo o grupo 08, transporte), território sem ano parcial, participações somando 100%, previsão com 12 meses dentro da faixa. Ao mexer no pipeline, atualize as asserts junto — e note que `validar_dados.py:66` ainda exige **exatamente 43 janelas**, o que quebra assim que entrar competência nova.

## Limpeza de 21/09/2026

Removidos por não serem usados por nada vivo — recuperáveis em `git log`, commit anterior a `feat: limpeza`:
`web_dashboard/` (a v1 inteira), `docs/amostra/` (protótipo e build duplicado), `docs/pranchas/`, `docs/tarefas/`, `docs/evidencias/baseline-v1/`, `scripts/build_netlify.mjs`, e dois CSVs órfãos (`indicadores_municipio_valor_brasil.csv`, `valor_municipio_dialise_brasil_long.csv`).

`legado/` **permanece**: é a extração antiga do Ceará, o notebook e o Streamlit da autora, com `legado/README.md` explicando por que `procedimentos_dialise_filtrados.csv` não prova o recorte atual.
