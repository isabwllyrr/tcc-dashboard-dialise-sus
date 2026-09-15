# Integracao de populacao e IPCA do IBGE

## Objetivo

A integracao permite separar crescimento nominal de crescimento real e comparar municipios de portes populacionais diferentes. Os dados assistenciais permanecem provenientes do SIA/SUS; o IBGE fornece apenas denominadores populacionais e o indice de precos.

## Fontes

- Estimativas anuais da populacao municipal: SIDRA, tabela 6579.
- Populacao do Censo Demografico 2022: SIDRA, tabela 4709.
- IPCA mensal, numero-indice: SIDRA, tabela 1737.

## Populacao de 2023

Como os arquivos disponibilizados nao continham uma estimativa municipal para 2023, foi utilizada interpolacao geometrica entre 2022 e 2024:

```text
Pop_2023 = raiz_quadrada(Pop_2022 * Pop_2024)
```

O resultado foi arredondado para o habitante inteiro mais proximo e identificado no banco como valor interpolado.

## Correcao monetaria

Todos os valores reais usam junho de 2026 como referencia:

```text
fator_t = IPCA_jun_2026 / IPCA_t
valor_real_t = valor_nominal_t * fator_t
```

Para os indicadores territoriais anuais, utiliza-se a media anual do numero-indice do IPCA.

## Indicadores normalizados

```text
valor_real_por_habitante_ano = soma(valor_real_2015_2025) / soma(populacao_2015_2025)
qtd_por_100_mil_ano = soma(qtd_2015_2025) / soma(populacao_2015_2025) * 100000
```

Essas medidas representam medias anuais ponderadas pela exposicao populacional. Elas nao estimam pacientes unicos e nao devem ser interpretadas como prevalencia de doenca renal.

No mapa por UF, o denominador corresponde a toda a populacao estadual, inclusive municipios sem producao de dialise registrada no recorte. Nos indicadores municipais, o denominador e a populacao do proprio municipio.

## Reproducao

O processamento e realizado por `scripts/integrar_ibge.py`. A validacao automatica verifica continuidade do IPCA, unicidade municipio-ano, cobertura populacional e consistencia da correcao monetaria.
