# Rastreabilidade dos números publicados

Este documento registra o caminho dos números que chegam ao HTML. As páginas Astro leem o dossiê durante o build por meio de `src/lib/dossie.ts`; não existe uma segunda tabela de valores no front-end.

| Rota ou função | Chaves publicadas | Documento canônico | Origem registrada no próprio ponto |
|---|---|---|---|
| `/` | total acumulado, quantidade de competências e competências provisórias | `dossie/nacional.json` · `G3.achado.total_procedimentos` e `series.g3_quantidade_mensal` | `dados_tratados/dialise_mensal_brasil_total.csv` → `scripts/gerar_dossie.py` |
| `/evidencias/valor/` | G1 anual nominal/real; G2 médias e variações | `dossie/nacional.json` · `series.g1_valor_anual`, `series.g2_medias_periodo`, `achados` | cada ponto conserva arquivo CSV, colunas, script e transformação |
| `/evidencias/contagem/` | G3 mensal, estado observado/provisório e acumulado | `dossie/nacional.json` · `series.g3_quantidade_mensal` e achado G3 | cada competência conserva origem e estado; não há correção automática |
| `/evidencias/territorio/` | G4 por UF/ano e G7 municipal | `dossie/territorio/indice.json` e `dossie/territorio/distribuicao.json` | taxa conserva denominador, fonte populacional e estado; exclusões de G7 são explícitas |
| `/evidencias/territorio/<uf>/` | G5 anual e tabela municipal por ano | `dossie/territorio/uf-<UF>.json` e `dossie/territorio/indice.json` | valores, taxas e denominadores conservam origem; `sem_registro` permanece nulo |
| `/evidencias/modelo/` | comparação de modelos, viés por horizonte e previsão com intervalo | `dossie/modelo.json` | `evidencia_modelos_*.csv` e `previsao_mensal_proximos_12m_corrigido.csv` → pipeline de modelo → gerador do dossiê |
| `/sobre-a-base/` | cobertura, fontes, escopo, quantidade de arquivos e hashes | `manifesto.json`, `glossario.json`, `ressalvas.json` | manifesto e contratos aprovados |
| `/assistente/` e `/api/agent` | respostas e citações de rota | documentos acima, carregados no servidor | o cliente envia apenas pergunta e filtros enumerados; `payload.context` é ignorado |

A geometria do mapa vem de `web_dashboard/assets/brazil-states.geojson`. `scripts/extrair_mapa_svg.py` extrai apenas os caminhos aprovados para `src/data/mapa-ufs.json`; classes, rótulos e valores são reconstruídos de `indice.json` no build e na ilha territorial.

Constantes de apresentação — dimensões de SVG, pontos de quebra CSS, tamanho de alvo e nível de confiança nomeado pelo contrato — não são resultados analíticos. Todo resultado analítico visível é formatado a partir de uma chave do dossiê.

## Contraprovas editoriais

- G2 publica as variações separadamente e diz expressamente que não são somadas.
- Nenhuma rota converte procedimentos em pessoas ou divide o acumulado por doze ou treze.
- G4/G5 descrevem concentração por local de atendimento, nunca prevalência.
- G6 apresenta primeiro o vencedor nominal (Holt–Winters) e depois o vencedor real (Gradient Boosting), sem troca silenciosa de alvo.
- Maio e junho de 2026 preservam o estado provisório e não recebem ajuste automático.

