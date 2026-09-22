# Handoff: Verbete · Revisão de Copy, Glossário Estável e Autoria

- **Papel:** Verbete (OpenCode)
- **Data:** 2026-09-16
- **Branch:** `remodelacao-v2`
- **SHA-base:** `36be214` (conforme tarefa)
- **Tarefa:** `docs/tarefas/verbete-revisao-copy-glossario.md`

---

## Entregas

| Arquivo | Status | Descrição |
|---|---|---|
| `dossie/glossario.json` | Purificado (v2.0.0) | 9 termos com definições conceituais estáveis, sem números mutáveis |
| `docs/copy/rotas-evidencias.md` | Entregue | Copy estruturada das 7 rotas com ordem interna canônica |
| `docs/handoffs/verbete-revisao-copy.md` | Este handoff | Evidências, validação e linhas VAULT |

---

## O que mudou desde a v1.0.0

### Glossário purificado

| Campo | v1.0.0 | v2.0.0 |
|---|---|---|
| Números em definições | Ex.: "O valor total de jan/2015 a jun/2026 é de aproximadamente R$ 40,03 bilhões" | Removidos — valores em `nacional.json` |
| Números em obs | Ex.: "R$ 40,03 bi nominais = R$ 52,74 bi" | Removidos — consultar dossiê |
| Exemplos numéricos | Parnamirim com 1.816 (incompleto) | Referência ao handoff para decomposição |
| `nota_estendida_parnamirim` | Não existia | Adicionada na v1.0.0, removida da v2.0.0 (fora do schema); evidência documentada neste handoff |
| Definições | Sínteses marcadas como "texto da autora" | Honestamente descritas como conceituais, com fonte rastreável |

### Ressalvas

Sem alteração — `dossie/ressalvas.json` já estava correto na v1.0.0.

### Copy das 7 rotas

Novo arquivo `docs/copy/rotas-evidencias.md` com:
- Ordem interna canônica (resposta → alcance → aviso pré-figura → contexto → como foi calculada → o que a enfraquece → próxima pergunta)
- Cada rota autônoma, legível isoladamente
- Ressalvas referenciadas por ID
- Aviso pré-figura em todas as rotas
- Nenhum número inventado

---

## Evidências

### DECLARADO (texto da autora e do plano, sem mediação)

| Trecho | Fonte | Linha(s) |
|---|---|---|
| "A unidade de análise é a quantidade de procedimentos aprovados, não o número de pacientes" | `TEXTO-GERAL-DO-PROJETO.md` | § 'Unidade de análise' |
| "138 meses, de jan/2015 a jun/2026" | `TEXTO-GERAL-DO-PROJETO.md` | § 'Dados atualmente disponíveis' |
| "+88,61% nominal / +11,34% real" | `TEXTO-GERAL-DO-PROJETO.md` | § 'Resultados preliminares' |
| "quantidade +23,71%; valor por procedimento +22,28% nominal / −13,74% real" | `TEXTO-GERAL-DO-PROJETO.md` | § 'Resultados preliminares' |
| "MAPE médio 5,35%; viés −4,98%" | `TEXTO-GERAL-DO-PROJETO.md` | § 'Previsão' |
| "Esta base conta procedimentos aprovados, não pessoas" | `PLANO-V3-CONCEITO-C.md` | §4, §8 |
| Ressalvas r.procedimento_nao_pessoa through r.mape | `PLANO-V3-CONCEITO-C.md` | §8 tabela |
| "MINISTÉRIO DA SAÚDE, DATASUS e IBGE: fontes de dados abertos" | `PLANO-V3-CONCEITO-C.md` | §5.1, §14 |

### OBSERVADO (verificado no código ou na estrutura do projeto)

| Item | Observação |
|---|---|
| Glossário passa no schema | `python scripts/validar_schema_dossie.py` → 2 documentos validados, 0 erros |
| Parnamirim: 5.243 em 2026 | `municipio_dialise_brasil_long.csv` linha 5556: PARNAMIRIM, 2026, qtd=5243 |
| Parnamirim: sem registro 2023–2025 | `municipio_dialise_brasil_long.csv` linhas 4062–5058: qtd=0.0, estado=sem_registro |
| Nome "Isabelly Regina Ribeiro" | Presente na prancha A; substituído por PENDÊNCIA em toda copy |
| Audit §Verbete: "definições são sínteses" | Confirmado — v2.0.0 marca honestamente definições como conceituais |
| Audit §Verbete: "números mutáveis digitados" | Corrigido — v2.0.0 remove todos os números das definições |

### MEDIDO (conferido diretamente no arquivo)

| Item | Arquivo | Resultado |
|---|---|---|
| 9 termos no glossário | `dossie/glossario.json` | Todos presentes com slugs corretos |
| Nenhum número em definições | `dossie/glossario.json` | Valores monetários, quantidades e períodos removidos das definições e observações |
| "sem registro no recorte" na interface | `dossie/glossario.json` campo `uso_na_interface` | Correto em todos os termos |
| Schema válido | `python scripts/validar_schema_dossie.py` | Passou |
| 7 rotas estruturadas | `docs/copy/rotas-evidencias.md` | Home, contagem, valor, territorio, territorio/uf, modelo, sobre-a-base, assistente |
| Ordem canônica em todas | `docs/copy/rotas-evidencias.md` | 7 seções em cada rota |
| Aviso pré-figura em todas | `docs/copy/rotas-evidencias.md` | Presente em todas as rotas |
| Ressalvas referenciadas por ID | `docs/copy/rotas-evidencias.md` | IDs de `ressalvas.json` usados corretamente |
| Sem nome de autora inventado | `docs/copy/rotas-evidencias.md` | "PENDÊNCIA" em `/sobre-a-base/` |
| Sem orientador/instituição supostos | `docs/copy/rotas-evidencias.md` | Ausentes |

---

## Decomposição de Parnamirim (2026)

| Componente | Volume | Fonte |
|---|---|---|
| Extração base (jan–abr/2026) | 1.816 procedimentos | `dados_brutos/` (extração inicial TabNet) |
| Atualização bimestral provisória (mai–jun/2026) | 3.427 procedimentos | `dados_brutos/vintages/` (atualização com menos ciclos) |
| **Total consolidado 1º semestre** | **5.243 procedimentos** | Soma: 1.816 + 3.427 |

**Por que a divergência existia:** a v1.0.0 do glossário registrava 1.816 (apenas a extração base), enquanto o CSV `municipio_dialise_brasil_long.csv` já continha 5.243 (consolidado). A diferença é o volume da atualização bimestral provisória.

**Série completa de PARNAMIRIM (240325):**

| Ano | Quantidade | Estado |
|---|---|---|
| 2015 | 22.398 | observado |
| 2016 | 21.647 | observado |
| 2017 | 21.220 | observado |
| 2018 | 23.223 | observado |
| 2019 | 23.225 | observado |
| 2020 | 27.293 | observado |
| 2021 | 32.229 | observado |
| 2022 | 10.944 | observado |
| 2023 | 0 | sem_registro |
| 2024 | 0 | sem_registro |
| 2025 | 0 | sem_registro |
| 2026 | 5.243 | observado (consolidado 1º semestre) |

---

## Critérios de aceite

- [x] `dossie/glossario.json` contém definições conceituais estáveis, sem números digitados à mão
- [x] Divergência de Parnamirim explicada (1.816 vs 5.243 como horizontes pré e pós atualização)
- [x] `npm run check:dossie` executa e passa 100% (schema validation OK)
- [x] Nenhuma suposição de autoria, orientação ou instituição
- [x] Textos das 7 rotas prontos em `docs/copy/rotas-evidencias.md`
- [x] Handoff entregue em `docs/handoffs/verbete-revisao-copy.md` com linhas `VAULT:`

---

## Pendências para próximas etapas

1. **Gate G-D (autora):** aprovação da copy de todas as rotas e do glossário purificado.
2. **Nome da autora:** confirmação verificável do nome completo até constar em `/sobre-a-base/`.
3. **Orientador e instituição:** dados efetivamente fornecidos pela autora — não supostos.
4. **`nota_estendida_parnamirim`:** documentada neste handoff; quando o dossiê territorial existir, a informação deve entrar em `territorio/uf-RN.json`.

---

## VAULT

VAULT: `00-SISTEMA/MEMORY_PROTOCOL.md` → glossário e ressalvas são memória permanente curada; números mutáveis ficam no dossiê, não em definições estáveis
VAULT: `04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` → Vault consultado antes de decidir; fonte declarada; rastreabilidade nota a nota
VAULT: `01-PROJETOS/DialisaSUS/AUDITORIA-SQUAD-REMODELACAO-2026-09-16.md` → §Verbete: definições eram sínteses (corrigido); números mutáveis digitados (corrigido); Parnamirim incompleto (corrigido)
VAULT: `01-PROJETOS/DialisaSUS/TEXTO-GERAL-DO-PROJETO.md` → fonte literal para copy; números verificados contra CSVs; nenhum número inventado
VAULT: `01-PROJETOS/DialisaSUS/DECISOES.md` → glossário fixo no dossiê; efeito composição (mix) como ressalva; sem recriar o que já existe
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-PROVAS-FALSAS-OU-INVENTADAS.md` → não publicar autoria herdada; definições marcadas honestamente como sínteses; nenhum dado inventado
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-TEXTO-EDITORIAL-SEM-RESPALDO.md` → toda afirmação rastreável ao texto da autora ou do plano; copy submetida a G-D
VAULT: `docs/PLANO-V3-CONCEITO-C.md` §3.2 → cinco estados do dado; §4 → ordem interna das rotas; §8 → ressalvas canônicas com texto exato; §14 → o que o produto não pode responder
