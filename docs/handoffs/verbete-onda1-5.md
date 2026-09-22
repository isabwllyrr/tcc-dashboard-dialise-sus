# Handoff: Verbete · Onda 1.5 — Glossário Fixo e Ressalvas Canônicas

- **Papel:** Verbete (OpenCode)
- **Data:** 2026-09-16
- **Branch:** `remodelacao-v2`
- **Tarefa:** `docs/tarefas/verbete-onda1-5.md`

---

## Entregas

| Arquivo | Status | Descrição |
|---|---|---|
| `dossie/glossario.json` | Entregue | 9 termos canônicos com definições fiéis à autora |
| `dossie/ressalvas.json` | Entregue | 8 ressalvas canônicas catalogadas por ID |

---

## Evidências

### DECLARADO (texto da autora, sem mediação)

| Termo / Ressalva | Fonte exata | Linha(s) |
|---|---|---|
| procedimento aprovado | `TEXTO-GERAL-DO-PROJETO.md` | § 'Dados atualmente disponíveis' (linhas 22–29), § 'Unidade de análise' (linhas 33–34) |
| valor aprovado | `TEXTO-GERAL-DO-PROJETO.md` | § 'Dados atualmente disponíveis' (linha 27), § 'Resultados preliminares' (linhas 37–39) |
| competência | `TEXTO-GERAL-DO-PROJETO.md` | § 'Dados atualmente disponíveis' (linhas 25–26, 29) |
| sem registro no recorte | `docs/PLANO-V3-CONCEITO-C.md` | §3.2 (linhas 99–125), §8 (tabela de ressalvas, linhas 364–376) |
| dado provisório | `TEXTO-GERAL-DO-PROJETO.md` | § 'Previsão' (linha 67); `PLANO-V3-CONCEITO-C.md` §3.2 (linhas 118–119) |
| estimativa | `TEXTO-GERAL-DO-PROJETO.md` | § 'Previsão' (linha 67), § 'Novas bases recomendadas' (linhas 90–95); `PLANO-V3-CONCEITO-C.md` §3.2 (linhas 119–120) |
| taxa por 100 mil hab. | `TEXTO-GERAL-DO-PROJETO.md` | § 'Novas bases recomendadas' (linha 91) |
| valor real (IPCA) | `TEXTO-GERAL-DO-PROJETO.md` | § 'Novas bases redunda' (linhas 96–100); `CONTEXTO.md` § 'População IBGE e IPCA' (linha 31) |
| local de atendimento | `TEXTO-GERAL-DO-PROJETO.md` | § 'Dados atualmente disponíveis' (linha 22); `CONTEXTO.md` § 'Território é por local de ATENDIMENTO' (linha 56) |
| r.procedimento_nao_pessoa | `PLANO-V3-CONCEITO-C.md` | §8 tabela (linha 368) |
| r.atendimento | `PLANO-V3-CONCEITO-C.md` | §8 tabela (linha 369) |
| r.sem_registro | `PLANO-V3-CONCEITO-C.md` | §8 tabela (linha 370) |
| r.provisorio | `PLANO-V3-CONCEITO-C.md` | §8 tabela (linha 371) |
| r.denominador_2022 | `PLANO-V3-CONCEITO-C.md` | §8 tabela (linha 372); `CONTEXTO.md` § 'Quebra do denominador' (linhas 59–60) |
| r.populacao_2023 | `PLANO-V3-CONCEITO-C.md` | §8 tabela (linha 373); `TEXTO-GERAL-DO-PROJETO.md` § 'Novas bases' (linha 91) |
| r.mix | `PLANO-V3-CONCEITO-C.md` | §8 tabela (linha 374); `DECISOES.md` § 'Efeito composição (mix)' (linha 13) |
| r.mape | `PLANO-V3-CONCEITO-C.md` | §8 tabela (linha 375); `TEXTO-GERAL-DO-PROJETO.md` § 'Previsão' (linhas 61–66) |

### OBSERVADO (verificado no código ou na estrutura do projeto)

| Item | Observação |
|---|---|
| `sem_registro` ≠ zero | Confirmado em `CONTEXTO.md` linhas 53–54: PARNAMIRIM, MAUÁ e ESTRELA têm traço do TabNet que o pipeline convertia em 0.0; os municípios voltam a ter registros anos depois |
| 5 estados do dado | Confirmado em `PLANO-V3-CONCEITO-C.md` §3.2 (tabela linhas 116–121): observado, provisório, estimado, sem_registro, ausente |
| Palavra da interface fixada | `PLANO-V3-CONCEITO-C.md` §3.2 linha 123: "sem registro no recorte" é a forma canônica, nunca "zero", "fechou" ou "sem serviço" |
| IPCA base jun/2026 | `CONTEXTO.md` linha 31: R$ 40,03 bi nominais = R$ 52,74 bi em reais de jun/2026 |
| 2023 interpolado | `CONTEXTO.md` linha 30: "2023 é interpolação geométrica entre o Censo 2022 e a estimativa 2024" |
| Local de atendimento | `CONTEXTO.md` linha 56: "Território é por local de ATENDIMENTO" — escrito na primeira linha de toda extração nacional |

### MEDIDO (conferido diretamente no arquivo)

| Item | Arquivo | Resultado |
|---|---|---|
| 9 termos no glossário | `dossie/glossario.json` | Presentes: procedimento_aprovado, valor_aprovado, competencia, sem_registro, dado_provisorio, estimativa, taxa_por_100_mil_habitantes, valor_real, local_de_atendimento |
| 8 ressalvas catalogadas | `dossie/ressalvas.json` | Presentes: r.procedimento_nao_pessoa, r.atendimento, r.sem_registro, r.provisorio, r.denominador_2022, r.populacao_2023, r.mix, r.mape |
| Slug `sem_registro` | `dossie/glossario.json` | Campo `uso_na_interface` = "sem registro no recorte" |
| Nenhuma conclusão inventada | Revisão do autor | Todos os textos das definições e ressalvas reproduzem fielmente o texto da autora e do plano; nenhuma frase nova foi adicionada |

---

## Critérios de aceite

- [x] `dossie/glossario.json` gerado com todos os 9 termos obrigatórios e definições fiéis à autora
- [x] `dossie/ressalvas.json` gerado com as 8 ressalvas canônicas catalogadas por ID
- [x] A expressão "sem registro no recorte" adotada estritamente para `sem_registro`
- [x] Nenhuma suposição ou conclusão inventada
- [x] Handoff entregue em `docs/handoffs/verbete-onda1-5.md` com evidências e linhas VAULT

---

## Nota

O glossário e as ressalvas são **textos estáticos** que viajam com o dossiê. Quando o pipeline emitir `dossie/nacional.json` e os arquivos de território, cada ponto de série poderá referenciar as ressalvas por ID (campo `ressalvas` no schema do achado, conforme §3.5 do plano). O glossário é consumido tanto pelos componentes da interface quanto pelo assistente (§8 e §9 do plano).

---

## VAULT

VAULT: `00-SISTEMA/MEMORY_PROTOCOL.md` → proposta de sessão não vira arquitetura vigente sem aprovação; glossário e ressalvas são memória permanente curada, não log de sessão
VAULT: `04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` → Vault consultado antes de decidir; fonte declarada em cada entrada; rastreabilidade nota a nota
VAULT: `01-PROJETOS/DialisaSUS/TEXTO-GERAL-DO-PROJETO.md` → fonte soberana para definições de procedimento aprovado, valor aprovado, competência, estimativa, taxa por 100 mil hab., valor real e local de atendimento
VAULT: `01-PROJETOS/DialisaSUS/DECISOES.md` → efeito composição (mix) como ressalva canônica; decisão de glossário fixo no dossiê
VAULT: `01-PROJETOS/DialisaSUS/CONTEXTO.md` → confirmação de IPCA base jun/2026, população 2023 interpolada, território por local de atendimento, 5 estados do dado
VAULT: `docs/PLANO-V3-CONCEITO-C.md` §3.2 → cinco estados do dado com tabela; §8 → oito ressalvas canônicas com texto exato; definição de "sem registro no recorte" como palavra da interface
