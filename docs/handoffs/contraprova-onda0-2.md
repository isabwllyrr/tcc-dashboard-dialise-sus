# Handoff · Contraprova · Onda 0.2 — parecer pós-integração

- **Responsável:** Contraprova — Red Team e Guarda de Método
- **Identidade conferida:** `maestri list` retornou `Contraprova` / `DialisaSUS · Contraprova — Red Team e Guarda de Método`
- **Data:** 2026-09-16
- **Checkout auditado:** `C:\Users\Antonio\Desktop\dialisasus`, branch `remodelacao-v2`, HEAD `36be2141c0b7b30a6de59d282d6f118edad642ad`
- **Parecer formal:** **READY WITHIN REVIEWED SCOPE — APROVADO PARA PROMOÇÃO DA ONDA 0 NO ESCOPO MUNICIPAL**
- **Completude:** **completa para a Onda 0.2**
- **Alterações desta Contraprova:** regeneração da evidência JSON e atualização deste handoff; nenhum arquivo do pipeline foi alterado.
- **Commit, push ou deploy:** não realizados.

## Veredito executivo

**DECLARADO:** a integração no checkout principal deveria preservar `-` como `sem_registro`, gravar valor e quantidade nulos, impedir variações fabricadas, sustentar os três casos notórios e reproduzir a coorte municipal autorizada.

**OBSERVADO:** o checkout principal agora contém `estado_registro`, mantém nulos os pares `sem_registro`, propaga o estado aos indicadores municipais e possui asserts contra zero fabricado e crescimento sobre subperíodos sem registro. O validador principal e o teste de qualidade terminaram com exit code 0.

**MEDIDO:** os 673 pares `-` de 5.478 células município-ano em 2015–2025 foram reconciliados integralmente: **673/673** aparecem como `sem_registro`, **673/673** têm `valor_aprovado` e `qtd_aprovada` nulos, **0/673** viraram zero e a máscara coincide exatamente com os dois brutos. A coorte continua em **393 / 386 / 7 / 161 / 41,71%**.

Conclusão: **a falha bloqueante anterior foi corrigida no checkout principal. O tratamento municipal, os CSVs regenerados e as guardas atendem aos critérios da Onda 0.2.**

## Execução solicitada e cadeia de custódia

Comando executado literalmente:

```powershell
python scripts/auditar_contraprova_onda0_2.py --repo . --candidate . --output docs/evidencias/contraprova-onda0-2.json
```

Resultado: exit code 0. O recálculo usa `csv` e `Decimal` da biblioteca padrão, não importa funções do pipeline e não usa o handoff do Aferidor como fonte.

Hashes da execução atual:

| Artefato | SHA-256 |
|---|---|
| `scripts/auditar_contraprova_onda0_2.py` | `982893687a6c192566d843b134d0e592b729b6961f8ca19c4cc247da1c199ace` |
| `docs/evidencias/contraprova-onda0-2.json` | `860b6ec4c9ea31777a4063f70f341964715a57029eb657fbf42752962790449d` |
| `dados_tratados/municipio_dialise_brasil_long.csv` | `2ee5810f4f4246d8fe69f03bda29a7c7ae54a9669bc49ed2aec603bab51c65a9` |
| `scripts/tratamento_municipio_dialise.py` | `30fb714a754768f896d4f0986d2006b55bf7d3746cb29d4652de8af1c8e5707b` |
| `scripts/validar_dados.py` | `dd8d52958996a6ae6ab56d4c6afcb8680c2190b57835f3735773c9eda25e6866` |

Fontes brutas mantiveram os hashes da primeira Contraprova:

| Fonte | SHA-256 |
|---|---|
| `dados_brutos/qtd_municipio_dialise_brasil.csv` | `3f703ebf86c383a1bb42c7ecd6558b9f3e92711270b3d8c2832bd71d8d3b39a5` |
| `dados_brutos/valor_municipio_dialise_brasil.csv` | `9b9b230d1500de7bba694e0877d898b7eee1ef90357f5167015715529a6a1860` |
| `dados_brutos/atualizacao_2026_05_06_qtd_municipio.csv` | `51b16c787a3bc42d759ae92e222880d0164c784dec8f618b2f6f3a303f9af8d3` |
| `dados_brutos/atualizacao_2026_05_06_valor_municipio.csv` | `98e2b3fea666529305ee8dde3fb2900b091149b697b055ed2b4834ba6fb23f9c` |
| `dados_brutos/ipca_ibge_indice_2015_2026_06.csv` | `79e82528b996ed3251aaab03560c85de2de1088a47b9710aa8d1e828ae3e8310` |

## 1. Células `-` e preservação semântica

| Evidência | DECLARADO | OBSERVADO | MEDIDO | Veredito |
|---|---:|---:|---:|---|
| Municípios | 498 | mesmas chaves nos brutos e tratado | 498 | PASS |
| Anos fechados | 2015–2025 | 11 anos | 11 | PASS |
| Células por arquivo | 5.478 | 498 × 11 | 5.478 | PASS |
| Células `-` | 673 | máscara idêntica em quantidade e valor | 673 em cada bruto | PASS |
| Proporção | 12,3% | cálculo exato | 12,285505659% | PASS |
| Estado no tratado | `sem_registro` | estado presente | 673/673 | PASS |
| Valores no tratado | nulos | valor e quantidade vazios | 673/673 | PASS |
| Conversões para zero | nenhuma | nenhum caso encontrado | 0/673 | PASS |

A amostra cega determinística de 12 células foi repetida com a mesma seed. Todos os casos que antes apareciam como `0.0` no checkout principal agora aparecem como nulo + `sem_registro`:

| Código | Município/UF | Ano | Bruto qtd/valor | Checkout principal integrado |
|---:|---|---:|---|---|
| 221060 | São Raimundo Nonato/PI | 2020 | `-` / `-` | nulo / nulo / `sem_registro` |
| 320060 | Aracruz/ES | 2016 | `-` / `-` | nulo / nulo / `sem_registro` |
| 313520 | Januária/MG | 2019 | `-` / `-` | nulo / nulo / `sem_registro` |
| 291640 | Itapetinga/BA | 2015 | `-` / `-` | nulo / nulo / `sem_registro` |
| 292990 | Seabra/BA | 2018 | `-` / `-` | nulo / nulo / `sem_registro` |
| 221060 | São Raimundo Nonato/PI | 2022 | `-` / `-` | nulo / nulo / `sem_registro` |
| 352310 | Itaquaquecetuba/SP | 2015 | `-` / `-` | nulo / nulo / `sem_registro` |
| 351050 | Caraguatatuba/SP | 2015 | `-` / `-` | nulo / nulo / `sem_registro` |
| 421003 | Luzerna/SC | 2019 | `-` / `-` | nulo / nulo / `sem_registro` |
| 351350 | Cubatão/SP | 2018 | `-` / `-` | nulo / nulo / `sem_registro` |
| 314560 | Oliveira/MG | 2015 | `-` / `-` | nulo / nulo / `sem_registro` |
| 231340 | Tianguá/CE | 2016 | `-` / `-` | nulo / nulo / `sem_registro` |

## 2. Casos notórios

| Caso | DECLARADO | OBSERVADO e MEDIDO no bruto | Estado no tratado | Veredito |
|---|---|---|---|---|
| Parnamirim/RN | sem registro 2023–2025; retorno em 2026 | 2023–2025 = `-`; Jan–Abr/2026 = 1.816; Mai–Jun = 3.427; total = **5.243** | 2023–2025 `sem_registro`; 2026 `provisorio` | PASS |
| Mauá/SP | registro em 2015; ausência 2016–2023; 12.955 em 2025 | 2015 = 3.046; 2016–2023 = `-`; 2024 = 1.639; 2025 = **12.955** | buraco nulo; 2024–2025 `observado` | PASS |
| Estrela/RS | registro em 2015; ausência intermediária; 10.857 em 2025 | 2015 = 2.209; 2016–2021 = `-`; 2022 = 1.464; 2025 = **10.857** | buraco nulo; retorno `observado` | PASS |

Os três retornam depois de anos com `-`; ausência é intermitente e não demonstra encerramento terminal. A divergência de Parnamirim está resolvida: **1.816** é Jan–Abr/2026 e **5.243** é Jan–Jun/2026.

## 3. Coorte municipal de 2015

Definição preservada: municípios com `valor_aprovado_real > R$ 2.000.000` em 2015. Comparação 2025 × 2015 somente quando as duas pontas têm registro numérico.

| Evidência | DECLARADO | OBSERVADO | MEDIDO | Veredito |
|---|---:|---|---:|---|
| Coorte 2015 | 393 | filtro literal `>` em 2015 | **393** | PASS |
| Observados em 2025 | 386 | estado `observado` | **386** | PASS |
| Sem registro em 2025 | 7 | estado `sem_registro`; números nulos | **7** | PASS |
| Quedas reais | 161 | somente os 386 comparáveis | **161** | PASS |
| Proporção | 41,71% | denominador 386 | **161/386 = 41,70984456%** | PASS |

Sete municípios confirmados nominalmente:

| Código | Município | UF | `estado_2025` | Campos derivados 2025 |
|---:|---|---|---|---|
| 240020 | Assu | RN | `sem_registro` | nulos |
| 240325 | Parnamirim | RN | `sem_registro` | nulos |
| 330030 | Barra do Piraí | RJ | `sem_registro` | nulos |
| 330360 | Paracambi | RJ | `sem_registro` | nulos |
| 355060 | São Roque | SP | `sem_registro` | nulos |
| 355070 | São Sebastião | SP | `sem_registro` | nulos |
| 420900 | Joaçaba | SC | `sem_registro` | nulos |

Uma segunda leitura independente do CSV tratado principal com pandas reproduziu `393 / 386 / 7 / 161 / 41,70984456%` e a mesma lista nominal.

## 4. Guarda de método

**DECLARADO:** nenhuma variação percentual pode dividir por `sem_registro` ou `ausente`, nem transformar ausência em queda de 100%.

**OBSERVADO:** `br_number_to_float()` devolve `NaN` para `-`; o preenchimento residual ocorre somente em linhas previamente classificadas como `observado` ou `provisorio`. Na soma parcial de 2026, dois fragmentos ausentes voltam explicitamente a `NaN`. O validador exige estado válido, valores nulos em `sem_registro`, derivados 2025 nulos e crescimento nulo quando um subperíodo inteiro não tem registro.

**MEDIDO:** os sete membros da coorte sem 2025 têm `estado_2025=sem_registro`, `estado_registro_2025=sem_registro` e os quatro campos numéricos verificados (`valor_2025`, `qtd_2025`, `qtd_por_100_mil_2025`, `valor_real_por_habitante_2025`) nulos. O recálculo independente atribui variação `null` aos sete; nenhuma queda de −100% foi materializada.

Parecer da guarda: **PASS no checkout principal integrado.**

## 5. Validações executadas

| Verificação | Resultado |
|---|---|
| Contraprova brutos × tratado com `--candidate .` | PASS; exit 0 |
| `python scripts/validar_dados.py` | PASS; “Validação concluída sem erros” |
| `python tests/test_data_quality.py` | PASS; 1 teste, exit 0 |
| Reconciliação pandas da coorte | PASS; 393/386/7/161/41,70984456% |
| Guarda dos sete derivados de 2025 | PASS; estados corretos e campos nulos |
| Compilação do script da Contraprova | PASS |

## Placar da revisão

Os totais são unidades do inventário deste escopo, não uma taxa de acurácia.

### Qualidade e completude do handoff

| Categoria | Defeitos observados | Avaliação |
|---|---:|---|
| Utilidade e completude | 0 / 4 | As quatro perguntas da tarefa têm evidência reproduzível. |
| Clareza analítica | 0 / 5 | População, período, filtro, denominador e ausências estão explícitos. |
| Consistência visual/interativa | N/A | Entrega Markdown, sem dashboard ou controle interativo. |

### Correção e robustez analítica

| Categoria | Defeitos observados | Avaliação |
|---|---:|---|
| Autoridade das fontes | 0 / 5 | Brutos locais identificados por hash; nenhum relato foi tratado como prova. |
| Exatidão dos valores | 0 / 5 | Traços, casos notórios, coorte, ausentes e quedas foram recalculados. |
| Concordância interna | 0 / 4 | Quantidade e valor têm a mesma máscara; bruto e tratado concordam. |
| Consistência entre artefatos | 0 / 2 | Checkout principal e evidência regenerada coincidem. |
| Controles de qualidade | 0 / 2 | As guardas existem, passam e foram conferidas nos casos de fronteira. |
| Suporte às conclusões | 0 / 4 | Todas as conclusões centrais estão ligadas a contagens ou linhas brutas. |

## Problemas priorizados e ressalvas

Nenhum P0 ou P1 permanece no escopo auditado.

1. **P2 não bloqueante — redação de Mauá:** o valor de 12.955 em 2025 está correto, mas o primeiro retorno numérico ocorre em 2024, com 1.639. Redação precisa: “retorna em 2024 e registra 12.955 em 2025”.

## Gate final

- Recálculo cego contra os brutos: **PASS**.
- 673/5.478 e 12,3%: **PASS**.
- Nenhum `-` convertido em zero: **PASS**.
- `sem_registro` + valores nulos: **PASS**.
- Parnamirim, Mauá e Estrela: **PASS**.
- Coorte 393/386/7/161/41,71%: **PASS**.
- Lista nominal dos sete: **PASS**.
- Guarda de método: **PASS**.
- Validador no checkout principal: **PASS**.
- **Decisão da Contraprova:** bloqueio territorial da Onda 0 **LIBERADO dentro do escopo revisado**.

VAULT: `00-SISTEMA/MEMORY_PROTOCOL.md` -> mantive a evidência auditável no repositório e não gravei no Vault um resultado de sessão já coberto pelas decisões permanentes.
VAULT: `04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` -> reconfirmei o Vault antes da reauditoria e registrei as regras aplicadas.
VAULT: `01-PROJETOS/DialisaSUS/AUDITORIA-SQUAD-REMODELACAO-2026-09-16.md` -> exigi que a mesma prova passasse no checkout de integração, não apenas em worktree isolada.
VAULT: `01-PROJETOS/DialisaSUS/DECISOES.md` -> preservei `sem_registro`, zero observado e ano ausente como estados distintos e tratei buracos como intermitentes.
VAULT: `01-PROJETOS/DialisaSUS/APRENDIDOS.md` -> mantive literalmente população, período, filtro, denominador e tratamento de ausências da coorte de 2015.
VAULT: `01-PROJETOS/DialisaSUS/CONTEXTO.md` -> limitei território a 2015–2025 e mantive a unidade como procedimentos aprovados, nunca pacientes.
VAULT: `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-PROVAS-FALSAS-OU-INVENTADAS.md` -> cada aprovação foi sustentada por fonte, hash, cálculo e execução reproduzível.
