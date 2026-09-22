# BRIEF — DialisaSUS v2

**Data:** 2026-09-15 · **Etapa:** 0 do [ROADMAP do Vault](../CLAUDE.md) · **Plano:** v3 sobre v2.
Este documento fixa o que o produto promete, para quem, com que prova e até onde vai. Tudo o que vier depois — pranchas, tokens, copy, rotas — responde a ele.

---

## 1. A pergunta

> Como os procedimentos de diálise aprovados pelo SUS evoluíram temporal e territorialmente, especialmente antes e depois da pandemia, e de que forma modelos preditivos e visualizações interativas podem apoiar o planejamento da gestão em saúde?

O produto não é "um dashboard sobre diálise". É **a resposta publicada a essa pergunta**, com os instrumentos que permitem a alguém conferir a resposta por conta própria.

**Teste de escopo:** se um bloco da interface não ajuda a responder à pergunta nem a auditar a resposta, ele não entra.

---

## 2. Audiências

| Audiência | O que ela precisa | O que ela vai fazer | Onde ela chega |
|---|---|---|---|
| **Banca e orientador** | Verificar método, recorte, limites e reprodutibilidade. Sabe estatística e vai procurar onde o trabalho é frágil. | Ler a metodologia antes de olhar o número. Testar se o erro do modelo está publicado. | `/metodologia/` e `/previsao/` |
| **Gestor ou técnico de saúde** | Saber se a pressão assistencial e o custo estão subindo no seu território, e o quanto disso é inflação. | Procurar a própria UF. Comparar com vizinhas. Exportar. | `/` e depois `/explorar/uf/<sigla>/` |
| **Estudante ou leitor interessado** | Entender o assunto sem vocabulário técnico, sem concluir coisa errada. | Ler de cima a baixo, uma vez. | `/` |

**Prioridade em caso de conflito:** banca > gestor > leitor. Este é um TCC antes de ser um produto. Quando rigor e conveniência colidirem, ganha o rigor — e a conveniência vira uma frase explicando por quê.

---

## 3. A promessa

**Uma década de diálise no SUS, medida com honestidade: o que cresceu, quanto disso é preço, onde acontece, e o que os dados não permitem dizer.**

Três compromissos que a promessa carrega e que o produto precisa cumprir de forma visível:

1. **Procedimento não é paciente.** A unidade é o procedimento aprovado. Uma pessoa em hemodiálise faz várias sessões por mês. Em nenhum lugar o produto converte um no outro, e ele diz isso no primeiro capítulo, antes do primeiro gráfico.
2. **Nominal não é real.** Crescimento em valor sem IPCA é crescimento fantasma. O produto mostra os dois e separa a parte que é inflação.
3. **Previsão não é fato.** O que foi observado e o que foi estimado nunca compartilham forma, cor ou palavra.

---

## 4. A prova

O que sustenta cada afirmação, e onde ela pode ser conferida:

| Afirmação | Prova | Onde |
|---|---|---|
| R$ 40,03 bi e 187,95 mi de procedimentos entre 01/2015 e 06/2026 | Série mensal do SIA/SUS, 138 competências, reconciliada contra a base tratada em 15/09/2026 | Abertura e `/metodologia/` |
| O valor cresceu 51,27% do pré para o pós-pandemia | Decomposição multiplicativa: quantidade ×1,2371 e preço ×1,2228. Em log, quantidade explica ~51% do crescimento e preço ~49% | Capítulo 3 |
| Parte do crescimento é inflação | IPCA mensal, base junho de 2026. Nominal R$ 40,03 bi = R$ 52,74 bi em reais de jun/2026 | Capítulo 2 e 3 |
| SP concentra o maior valor | Base territorial anual, 498 municípios, 2015–2025. Apresentado **junto** da taxa por 100 mil habitantes, porque concentração absoluta e pressão proporcional não são a mesma coisa | Capítulo 4 e `/explorar/` |
| A previsão tem erro conhecido | Backtest em janelas móveis de 12 meses, MAPE médio e mediano, MASE contra o sazonal ingênuo, erro por horizonte e faixa empírica de 95% | `/previsao/` |
| O recorte tem limites | Os 24 códigos do recorte, transcritos do cabeçalho do TabNet em `docs/RECORTE-SIGTAP.md`. O pré-dialítico entra; DPAC e DPA não; o território é por local de atendimento | `/metodologia/`, como ressalva declarada |

**Regra de origem:** nenhum número é digitado na copy. Todo número vem do `dossie.json` gerado pelo pipeline. Se um número não está no dossiê, ele não é dito.

---

## 5. O que o produto **não** faz

Declarado no ponto de uso, não em rodapé:

- Não estima número de pacientes, incidência nem prevalência. O Censo da SBN mede pacientes e **não se mistura** com procedimentos do SIA.
- Não faz diagnóstico, triagem clínica real nem avaliação individual. A triagem é demonstração educativa da lógica KDIGO.
- Não determina gasto futuro. A previsão é exploratória, com faixa e erro publicados.
- Não afirma causalidade. A pandemia aparece como inflexão observada, não como causa medida.
- O assistente não busca na web nem cria dados: responde a partir do dossiê e cita de onde tirou cada número.

---

## 6. Ação primária

**Uma só, no fim do relatório: "Explorar sua UF".**

O leitor que chegou ao fim da narrativa entendeu o quadro nacional; o passo seguinte natural é o território dele. Todas as outras rotas são alcançáveis pela navegação, nenhuma compete com essa no fechamento.

CTAs secundários, em contexto e nunca no fim: "Ver como o modelo erra" (do capítulo 5 para `/previsao/`) e "Conferir o recorte" (de qualquer ressalva para `/metodologia/`).

---

## 7. Teste de clareza

O produto passa se um leitor que nunca viu o assunto conseguir responder, só lendo a página inicial uma vez:

1. Quanto o SUS aprovou em diálise na última década, e esse número está em reais de quando?
2. O crescimento veio de mais procedimentos ou de procedimento mais caro?
3. Isso significa que há mais pacientes? **(Resposta esperada: os dados não permitem afirmar.)**
4. Qual UF está sob maior pressão proporcional — e por que ela não é necessariamente a de maior valor?
5. Dá para confiar na previsão de 2027? Até que ponto?

**Se a resposta 3 sair errada, o produto falhou** — independentemente de quão bonito esteja. É o único item eliminatório desta lista.

---

## 8. Restrições que o brief herda

- **Gates humanos:** números do TCC (autora e orientador), escolha entre as pranchas A e B, testes de uso, copy aprovada pela autora, deploy de preview só com autorização.
- **Recorte temporal:** 2026 é parcial (jan–jun) e os meses mais recentes são provisórios. O território comparável é 2015–2025.
- **Recorte:** 24 procedimentos, por local de **atendimento**. Ver `docs/RECORTE-SIGTAP.md`.
- **Fonte da copy:** `TEXTO-GERAL-DO-PROJETO.md` no Vault. O arquivo `estrutura tcc - isabelly.docx` do repositório **não** é o TCC — é um roteiro genérico de como fazer o trabalho e não contém copy nem números; serve apenas como estrutura de capítulos.
- **Sem splash, sem 3D, sem efeito de nível 1** no explorador e na triagem.

---

## VAULT
- `01-PROJETOS/DialisaSUS/TEXTO-GERAL-DO-PROJETO.md` → promessa, prova e números vêm daqui; nada é inventado
- `01-PROJETOS/DialisaSUS/CONTEXTO.md` → ressalva de recorte (DPAC/DPA e pré-dialítico) entra no brief como limite declarado
- `01-PROJETOS/DialisaSUS/DECISOES.md` → decomposição em log, glossário, três compromissos da promessa
- `02-CONHECIMENTO/PADROES/PADRAO-ARQUITETURA-LANDING-PAGE.md` → pergunta, evidência, mecanismo, projeção, limites, ação; **um** CTA primário
- `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-CTA-GENERICO.md` → "Explorar sua UF", com verbo e resultado
- `02-CONHECIMENTO/ANTI-PADROES/ANTI-PADRAO-COPY-INVENTADA-PELA-IA.md` + `ANTI-PADRAO-PROVAS-FALSAS-OU-INVENTADAS.md` → regra de origem: número só do dossiê
- `02-CONHECIMENTO/AGENT-WEB/CONTEXTO-E-CONFIABILIDADE-DA-DECISAO.md` → fato e estimativa nunca compartilham forma, cor ou palavra
- `02-CONHECIMENTO/PRINCIPIOS/PRODUCTION-READINESS-PROPORCIONAL-AO-RISCO.md` → rigor extra por ser saúde e IA; limites declarados no ponto de uso
