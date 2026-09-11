# Dicionario de dados

## Escopo

Os dados sao agregados do SIA/SUS por local de atendimento. `qtd_aprovada` representa procedimentos aprovados, nao pacientes unicos. `valor_aprovado` e nominal e nao foi corrigido pela inflacao.

O recorte nacional mensal vai de 2015-01 a 2026-06. O recorte territorial usa 2015 a 2025, somente anos completos. O transporte sanitario que apareceu apenas na atualizacao de maio e junho de 2026 foi excluido da serie nacional para preservar a comparabilidade historica.

## Variaveis principais

| Campo | Definicao | Unidade |
| --- | --- | --- |
| `data` | Primeiro dia do mes de atendimento | data |
| `valor_aprovado` | Valor nominal aprovado pelo SUS | reais |
| `qtd_aprovada` | Quantidade de procedimentos aprovados | procedimentos |
| `custo_medio` | `valor_aprovado / qtd_aprovada` | reais por procedimento |
| `valor_periodo` | Soma municipal nos anos completos de 2015 a 2025 | reais |
| `qtd_periodo` | Soma municipal nos anos completos de 2015 a 2025 | procedimentos |
| `crescimento_qtd_pos_vs_pre_pct` | Variacao da media anual 2022-2025 contra 2015-2019 | percentual |
| `MAPE_pct` | Media do erro percentual absoluto nas janelas de 12 meses | percentual |
| `MAPE_desvio_pct` | Desvio-padrao do MAPE entre janelas | pontos percentuais |
| `limite_inferior_95` / `limite_superior_95` | Faixa empirica baseada no percentil 95 do erro absoluto historico por horizonte | reais |
