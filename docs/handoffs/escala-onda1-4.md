# Handoff: Escala · Onda 1.4 — Tokens de dados

- **Responsável:** Escala — Visualização de Dados
- **Data:** 2026-09-16
- **Branch:** `remodelacao-v2`
- **Commit / push / deploy:** não realizados, conforme regra do projeto

## Resultado

Os 13 tokens pendentes foram fechados e o 14º token, `--status-sem-registro`, foi acrescentado. `tokens.json` agora contém 14 tokens no grupo `dataTokens`, zero ocorrência de `PENDENTE-ESCALA` e variantes próprias para claro e escuro.

O bloco `brand` permaneceu inalterado. As mudanças estão restritas à descrição raiz e ao grupo `dataTokens`.

## DECLARADO

- `--data-observed` usa linha sólida ou marca cheia; `--data-estimate` usa família exclusiva, tracejado `6 4` e rótulo; `--data-band` usa a família da estimativa com alfa de 16% no claro e 18% no escuro.
- `--data-seq-1` a `--data-seq-7` formam rampas verdes de um único matiz, monotônicas e específicas por tema.
- `--status-provisional`, `--status-observed` e `--status-estimated` têm paleta reservada e codificação secundária por forma, ícone e texto.
- `--status-sem-registro` é um token de padrão, não de cor de série: fundo transparente, hachura diagonal de 135°, fio de 1px, intervalo de 5px e rótulo obrigatório **“sem registro no recorte”**. Não representa zero nem magnitude e não entra em soma, taxa ou variação.
- O quinto estado, `absent`, fica sem marca de dado e exige o texto **“fora da extração”** no componente e na tabela; não recebe cor de série.

## OBSERVADO

- Contagem estrutural após parse do JSON: `14` tokens.
- Busca literal em `tokens.json`: `0` ocorrências de `PENDENTE-ESCALA`.
- `--status-sem-registro.type`: `pattern`.
- SHA-256 canônico do objeto `brand` antes e depois: `ccca966d13a55df4ee8ba361c480d3df78b430220be00e9c746b611fc982d195`.
- O diff de `tokens.json` não contém alteração dentro do bloco `brand`.
- `JSON.parse` em Node: sucesso; grupo `dataTokens.status = VALIDADO-ESCALA`; 14 chaves em `dataTokens.tokens`.

## MEDIDO

O validador executa as matrizes Machado para protanopia e deuteranopia no gate de separação e também calcula e relata a menor distância sob tritanopia. Todos os comandos abaixo terminaram com código `0`:

| Conjunto | Comando | Evidência principal |
|---|---|---|
| Séries · claro | `node tools/validate_palette.js "#007F67,#7C3AED" --mode light --surface "#F8F9FA" --pairs all` | pior CVD ΔE 22,3; tritan 10,3; contraste ≥ 3:1 |
| Séries · escuro | `node tools/validate_palette.js "#198F79,#8B5CF6" --mode dark --surface "#0A0E17" --pairs all` | pior CVD ΔE 20,5; tritan 10,2; contraste ≥ 3:1 |
| Rampa · claro | `node tools/validate_palette.js "#7DBBAB,#5FA595,#449181,#2E7C6B,#1F6957,#105242,#043A2E" --mode light --surface "#F8F9FA" --ordinal` | luminosidade monotônica; ΔL adjacente ≥ 0,06; ponta clara 2,08:1; matiz 6° |
| Rampa · escuro | `node tools/validate_palette.js "#31564F,#3B6C61,#438276,#4B998B,#54B09F,#60C7B4,#72DEC9" --mode dark --surface "#0A0E17" --ordinal` | luminosidade monotônica; ΔL adjacente ≥ 0,06; ponta escura 2,37:1; matiz 3° |
| Estados · claro | `node tools/validate_palette.js "#A35A09,#2A78D6,#4A3AA7" --mode light --surface "#F8F9FA" --pairs all` | pior CVD ΔE 13,0; tritan 17,4; contraste ≥ 3:1 |
| Estados · escuro | `node tools/validate_palette.js "#D97706,#0369A1,#A855F7" --mode dark --surface "#0A0E17" --pairs all` | pior CVD ΔE 13,9; tritan 16,2; contraste ≥ 3:1 |

Resultado agregado: `VALIDATION_FAILURES=0`.

O `--data-band` usa o mesmo matiz-base já validado em `--data-estimate`; seus alfas de 0,16 e 0,18 estão dentro do intervalo estrutural obrigatório de 12% a 20%. `--status-sem-registro` não integra nenhuma paleta cromática porque sua semântica é ausência de registro, não valor.

## Arquivos alterados

- `tokens.json`
- `docs/handoffs/escala-onda1-4.md`

VAULT: `00-SISTEMA/MEMORY_PROTOCOL.md` → Git foi tratado como verdade do estado atual; o handoff registra decisões e evidências sem gravar logs brutos no Vault.
VAULT: `04-DECISOES-GLOBAIS/DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` → o AI-Vault foi consultado antes da decisão e as regras aplicadas foram declaradas nesta entrega.
VAULT: `04-DECISOES-GLOBAIS/DECISAO-SOBERANIA-DOS-DESIGN-TOKENS.md` → o bloco `brand` foi preservado integralmente; apenas os tokens de dados explicitamente delegados à Escala foram fechados.
VAULT: `01-PROJETOS/DialisaSUS/DECISOES.md` → foram mantidos os cinco estados do dado, a separação entre `sem_registro` e zero e a exigência de variantes próprias por tema.
VAULT: `02-CONHECIMENTO/PADROES/PADRAO-DATAVIZ-ACESSIVEL.md` → séries, rampa e estados foram validados matematicamente em claro/escuro; cor recebeu codificação secundária e “sem registro” usa textura mais texto.
