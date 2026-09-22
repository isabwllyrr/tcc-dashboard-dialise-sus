# Dicionario de dados

## Escopo

Os dados assistenciais sao agregados do SIA/SUS por local de atendimento. `qtd_aprovada` representa procedimentos aprovados, nao pacientes unicos. O painel preserva o valor nominal e oferece, separadamente, o valor corrigido pelo IPCA.

O recorte nacional mensal vai de 2015-01 a 2026-06. O recorte territorial usa 2015 a 2025, somente anos completos. O transporte sanitario que apareceu apenas na atualizacao de maio e junho de 2026 foi excluido da serie nacional para preservar a comparabilidade historica.

## Variaveis principais

| Campo | Definicao | Unidade |
| --- | --- | --- |
| `data` | Primeiro dia do mes de atendimento | data |
| `valor_aprovado` | Valor nominal aprovado pelo SUS | reais |
| `qtd_aprovada` | Quantidade de procedimentos aprovados | procedimentos |
| `custo_medio` | `valor_aprovado / qtd_aprovada` | reais por procedimento |
| `ipca_indice` | Numero-indice mensal do IPCA | indice |
| `fator_correcao_jun_2026` | IPCA de junho de 2026 dividido pelo IPCA do mes observado | fator |
| `valor_aprovado_real` | Valor aprovado corrigido para reais de junho de 2026 | reais de jun/2026 |
| `custo_medio_real` | `valor_aprovado_real / qtd_aprovada` | reais de jun/2026 por procedimento |
| `provisorio` | Indica meses com dados incompletos (menos ciclos de processamento acumulados, ~1% subestimados). `true` para 2026-05 e 2026-06 | booleano |
| `valor_periodo` | Soma municipal nos anos completos de 2015 a 2025 | reais |
| `qtd_periodo` | Soma municipal nos anos completos de 2015 a 2025 | procedimentos |
| `populacao` | Populacao municipal no ano | habitantes |
| `valor_real_por_habitante_ano` | Valor real de 2015-2025 dividido pela soma das populacoes anuais | reais de jun/2026 por habitante/ano |
| `qtd_por_100_mil_ano` | Quantidade de 2015-2025 dividida pela soma das populacoes anuais, multiplicada por 100 mil | procedimentos por 100 mil habitantes/ano |
| `crescimento_qtd_pos_vs_pre_pct` | Variacao da media anual 2022-2025 contra 2015-2019 | percentual |
| `MAPE_pct` | Media do erro percentual absoluto nas janelas de 12 meses | percentual |
| `MAPE_desvio_pct` | Desvio-padrao do MAPE entre janelas | pontos percentuais |
| `limite_inferior_95` / `limite_superior_95` | Faixa empirica baseada no percentil 95 do erro absoluto historico por horizonte | reais |

## Fontes complementares

- Populacao estimada: IBGE/SIDRA, tabela 6579.
- Censo Demografico 2022: IBGE/SIDRA, tabela 4709.
- IPCA: IBGE/SIDRA, tabela 1737.
- Populacao de 2023: interpolacao geometrica entre 2022 e 2024.

## Dados provisorios

Os meses de maio e junho de 2026 (`provisorio = true`) provem de uma extracao intermediaria do TabNet com menos ciclos de processamento acumulados. Esses meses estao sujeitos a revisao quando a extracao definitiva for disponibilizada pelo DATASUS. A subestimacao estimada e da ordem de 1%. Esses meses sao a base da projecao de 12 meses, e a eventual divergencia entre valores provisorios e definitivos afeta diretamente a acuracia do modelo preditivo.
