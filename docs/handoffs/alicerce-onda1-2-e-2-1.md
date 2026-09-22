# Handoff: Alicerce · Ondas 1.2 e 2.1

- **Papel:** Alicerce — Arquitetura do dossiê e Schema Draft 2020-12
- **Data:** 2026-09-18
- **Checkout:** `C:\Users\Antonio\Desktop\dialisasus`
- **Branch:** `remodelacao-v2`
- **Status:** concluído no escopo solicitado
- **Commit, push ou deploy:** não realizados

## Resultado

As Ondas 1.2 e 2.1 foram materializadas no checkout principal. A agregação territorial produz os dois CSVs contratuais; o gerador produz os 32 documentos novos e preserva os dois documentos editoriais já aprovados, totalizando 34 documentos canônicos validados pelo JSON Schema Draft 2020-12.

O fechamento aplicou duas camadas de prova: guardas dentro dos scripts e recomputação independente diretamente dos CSVs. A soma estadual coincide exatamente com as medidas compartilhadas pelo CSV nacional — quantidade aprovada e valor aprovado nominal — em cada ano de 2015 a 2025.

## DECLARADO

- A unidade observada é **procedimento aprovado por local de atendimento**, nunca pessoa ou paciente.
- O território usa exclusivamente 2015–2025; 2026 não participa das comparações territoriais.
- `sem_registro` e `ausente` não são convertidos em zero e não entram em variações percentuais entre 2015 e 2025.
- Toda medida estatística do dossiê usa a forma canônica com `estado`, `unidade` e `origem` (`arquivos_csv`, `colunas`, `script`, `transformacao`).
- Toda taxa usa a forma canônica com `denominador` e `quebra_denominador`; o denominador informa valor, estado, unidade, fonte e origem.
- Mai e jun/2026 permanecem `provisorio`, sem correção automática.
- DPAC/DPA fora do recorte e `0405050054 CICLODIALISE` dentro dele permanecem questões de escopo declaradas no manifesto; nenhuma decisão metodológica foi tomada em silêncio.
- O modelo oficial não foi trocado. O dossiê apenas materializa a evidência comparativa já produzida pelo pipeline.

## OBSERVADO

### Agregação territorial

- `scripts/agregacao_territorial.py` valida o grão municipal, os cinco estados permitidos, a unicidade das chaves e a cobertura das 27 UFs antes de emitir arquivos.
- `dados_tratados/dialise_uf_total_anual.csv` tem exatamente as colunas contratuais:
  `uf`, `ano`, `qtd_aprovada`, `valor_aprovado_nominal`, `valor_aprovado_real`, `populacao`, `taxa_qtd_100k`, `valor_real_per_capita`.
- A população estadual é a soma das populações de todos os municípios da UF no ano, não apenas dos municípios com procedimento registrado.
- `dados_tratados/distribuicao_trajetorias_municipais.csv` contém sete faixas de variação real e quatro motivos de exclusão, além da linha explícita `excluido_total`.
- Os pares elegíveis exigem número confiável nos dois extremos e base 2015 diferente de zero.

### Dossiê canônico

- `scripts/gerar_dossie.py` materializa:
  - `dossie/manifesto.json`;
  - `dossie/nacional.json`;
  - `dossie/modelo.json`;
  - `dossie/territorio/indice.json`;
  - `dossie/territorio/distribuicao.json`;
  - 27 arquivos `dossie/territorio/uf-<UF>.json`.
- `dossie/glossario.json` e `dossie/ressalvas.json` permanecem no conjunto canônico aprovado.
- O manifesto registra hashes SHA-256 dos CSVs brutos, cobertura, fontes, códigos SIGTAP e questões abertas de escopo.
- Os documentos estaduais preservam `sem_registro` como valor e denominador nulos; não fabricam zero.
- O inventário está coberto de G1 a G7: G1–G3 em `nacional.json`, G4 no índice territorial, G5 nos documentos de UF, G6 em `modelo.json` e G7 na distribuição territorial.
- `docs/CONTRATO-DOSSIE.md` foi alinhado aos nomes e colunas efetivamente materializados.

### Validação incorporada

- `scripts/validar_schema_dossie.py` exige o conjunto exato de 34 documentos, inclusive as 27 siglas de UF, antes de validar instâncias.
- `scripts/validar_dados.py` agora verifica:
  - colunas, grão, anos e cobertura das 27 UFs;
  - reconciliação UF→Brasil;
  - recálculo das duas taxas estaduais;
  - fechamento das sete faixas e das exclusões municipais;
  - validade dos 34 documentos no Draft 2020-12;
  - tipos documentais esperados;
  - concordância de séries nacionais, mapa estadual, denominadores, documentos municipais, distribuição e evidência de modelos com os CSVs.
- `requirements.txt` declara `jsonschema==4.26.0` para tornar a validação reproduzível.

## MEDIDO

Execuções finais no checkout principal:

| Verificação | Resultado |
|---|---|
| `python scripts/agregacao_territorial.py` | exit 0; 297 linhas, 27 UFs, 11 anos |
| Reconciliação independente da quantidade | diferença absoluta máxima `0,0` |
| Reconciliação independente do valor nominal | diferença absoluta máxima `R$ 0,00` |
| Trajetórias comparáveis | 397 municípios |
| Exclusões reportadas | 101 municípios |
| Universo territorial | 397 + 101 = 498 municípios |
| `python scripts/gerar_dossie.py` | exit 0; 34 documentos, incluindo 27 UFs |
| `npm run check:dossie` | exit 0; Schema válido; 34/34 documentos válidos |
| `python scripts/validar_dados.py` | exit 0; validação concluída sem erros |
| Cobertura do inventário | IDs G1, G2, G3, G4, G5, G6 e G7 encontrados |

Detalhamento das exclusões municipais:

| Motivo | Municípios | Regra |
|---|---:|---|
| `novo_registro` | 82 | 2015 sem número confiável; 2025 com número |
| `sem_registro_final` | 8 | 2015 com número; 2025 sem número confiável |
| `sem_registro_ambos` | 11 | ambos os extremos sem número confiável |
| `excluido_base_zero` | 0 | base percentual 2015 igual a zero |
| **Total excluído** | **101** | soma exata dos motivos |

Tipos dos 34 documentos validados:

| `tipo_documento` | Quantidade |
|---|---:|
| `manifesto` | 1 |
| `nacional` | 1 |
| `modelo` | 1 |
| `territorio_indice` | 1 |
| `territorio_distribuicao` | 1 |
| `territorio_uf` | 27 |
| `glossario` | 1 |
| `ressalvas` | 1 |

## Arquivos da entrega

- `scripts/agregacao_territorial.py`
- `scripts/gerar_dossie.py`
- `scripts/validar_schema_dossie.py`
- `scripts/validar_dados.py`
- `requirements.txt`
- `dados_tratados/dialise_uf_total_anual.csv`
- `dados_tratados/distribuicao_trajetorias_municipais.csv`
- `dossie/manifesto.json`
- `dossie/nacional.json`
- `dossie/modelo.json`
- `dossie/territorio/indice.json`
- `dossie/territorio/distribuicao.json`
- `dossie/territorio/uf-<UF>.json` (27 arquivos)
- `docs/CONTRATO-DOSSIE.md`
- `docs/handoffs/alicerce-onda1-2-e-2-1.md`

## Limites preservados

- A reconciliação de 100% usa as medidas compartilhadas com `dialise_anual_brasil_total.csv`: `qtd_aprovada` e `valor_aprovado`. Esse CSV nacional não contém uma coluna de valor real.
- A deflação territorial mantém a transformação anual já definida no pipeline municipal; nenhuma nova regra monetária foi criada nesta onda.
- O uso das skills de qualidade e validação de dados levou à checagem explícita de grão, duplicatas, estados sentinela, cobertura de joins, denominadores e recomputação independente dos totais.
- Não foi gravada memória nova no Vault: a entrega implementa decisões já registradas e não cria decisão arquitetural nova.
- Nenhum commit, push ou deploy foi realizado.

## VAULT

VAULT: `00-SISTEMA/MEMORY_PROTOCOL.md` -> código e dados executados foram tratados como verdade atual; logs de execução ficaram no handoff, não na memória permanente.
VAULT: `04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` -> Vault consultado antes da execução e regras efetivamente usadas registradas nota a nota.
VAULT: `01-PROJETOS/DialisaSUS/DECISOES.md` -> cinco estados preservados, procedimentos não convertidos em pacientes, razão de somas aplicada e gates acadêmicos mantidos.
VAULT: `01-PROJETOS/DialisaSUS/ROADMAP.md` -> Ondas 1.2 e 2.1 materializadas sem avançar silenciosamente sobre gates de método, copy ou deploy.
