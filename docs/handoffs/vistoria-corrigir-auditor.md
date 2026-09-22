# Handoff: Vistoria · Correção das Ferramentas de QA (`tools/auditar-rotas.mjs`)

- **Papel:** Vistoria (Antigravity / Gemini)
- **Data:** 2026-09-16
- **Diretório de Trabalho:** `C:\Users\Antonio\Desktop\dialisasus`
- **Branch:** `remodelacao-v2`
- **SHA-base:** `36be214`
- **Status:** Concluído com sucesso (todos os critérios de aceite atendidos)

---

## BASE OBRIGATÓRIA NO OBSIDIAN (VAULT)

VAULT: `C:\Users\Antonio\AI-Vault\00-SISTEMA\MEMORY_PROTOCOL.md` → Aplicação da distinção estrita entre memória permanente e evidência de sessão; registro estruturado no handoff apenas de causas-raiz, regras aplicadas e comprovações empíricas.
VAULT: `C:\Users\Antonio\AI-Vault\04-DECISOES-GLOBAIS\DECISAO-OBSIDIAN-OBRIGATORIO-PARA-TODO-AGENTE.md` → Consulta prévia e mandatória das notas do Vault antes de alterar o código e formalização das linhas VAULT no handoff de entrega.
VAULT: `C:\Users\Antonio\AI-Vault\01-PROJETOS\DialisaSUS\AUDITORIA-SQUAD-REMODELACAO-2026-09-16.md` → Correção dos defeitos de QA apontados (§13, P1 item 3 e Defeitos do Processo de QA): eliminação da mensagem de falso sucesso, obrigatoriedade de exit code 1 em FAIL e delimitação do scanner CSS ao produto atual.
VAULT: `C:\Users\Antonio\AI-Vault\01-PROJETOS\DialisaSUS\APRENDIDOS.md` → Implementação da regra permanente de 2026-09-16: qualquer achado com severidade FAIL deve produzir exit code 1; scanners devem operar sobre fontes correntes com fixtures comprovando tokens `:root` multiline e inline.
VAULT: `C:\Users\Antonio\AI-Vault\02-CONHECIMENTO\ANTI-PADROES\ANTI-PADRAO-TESTES-VERDES-SEM-QA-VISUAL.md` → Rejeição de suites que anunciam "tudo verde" de forma complacente; testes e gates automatizados devem ser estritos e reprovar o processo perante qualquer não conformidade.

---

## 1. Problemas Diagnosticados na Auditoria Forense

Na auditoria forense de 2026-09-16 (`AUDITORIA-SQUAD-REMODELACAO-2026-09-16.md`), foram identificadas duas fragilidades severas em `tools/auditar-rotas.mjs`:
1. **Falso Sucesso e Exit Code Zero:** O script registrava `[FAIL]` no terminal para ausência de `h1`, ausência de canonical e violações de acessibilidade/overflow, porém terminava imprimindo `"Auditoria de Rotas Concluída com Sucesso!"` e retornando exit code 0 para o sistema operacional, permitindo que pipelines e agentes aceitassem páginas vazias ou quebradas.
2. **Scanner de CSS Frágil e com Escopo Aberto:** O scanner de CSS original fazia verificação ingênua por linha (`trimmed.startsWith('--')`), falhando na presença de seletores `:root` compactados em linha única (inline, ex.: `:root{ --bg:#FFFFFF; --tint:#F7F8F8; }`). Além disso, varria pastas não-produto (como `docs/amostra/site/assets/style.css`), gerando falsos positivos e ruído na homologação.

---

## 2. Refatoração Realizada em `tools/auditar-rotas.mjs`

### 2.1. Controle Estrito de Falhas e Exit Code Real
- Implementação de acumulador central de falhas `auditSummary`:
  ```javascript
  const auditSummary = {
    totalFails: 0,
    totalPasses: 0,
    totalWarnings: 0,
    failures: []
  };
  ```
- Função `recordFail(category, route, message, detail, failCount)` incrementa o contador estrito `auditSummary.totalFails` para qualquer falha (axe-core, overflow horizontal, falta ou duplicidade de `h1`, falta de canonical, erros de navegação HTTP ou cores hex literais fora de `:root`).
- Ao finalizar (tanto no fluxo completo de navegador quanto na flag `--css-only` via `finishAudit`):
  - Se `totalFails > 0`: imprime o banner `Auditoria Finalizada com FALHAS! (FAIL: X, PASS: Y)`, o resumo categorizado das falhas detectadas, a indicação `Status: REPROVADO (Exit Code 1)` e encerra o processo estritamente com `process.exit(1)`.
  - **NUNCA** imprime `"Auditoria de Rotas Concluída com Sucesso!"` se houver falhas.
  - Se e somente se `totalFails === 0`, imprime `"Auditoria de Rotas Concluída com Sucesso! (FAIL: 0, PASS: Y)"` e encerra com `process.exit(0)`.

### 2.2. Escopo do Scanner CSS Limitado ao Produto Atual
- O scanner agora ignora expressamente todos os diretórios que não são produto:
  ```javascript
  const DEFAULT_IGNORED_DIRS = [
    'node_modules',
    '.git',
    'dist',
    '.venv',
    'legado',
    '.claude',
    'docs/amostra',
    'docs/pranchas',
    'docs/evidencias',
    'screenshots'
  ];
  ```
- Quando executado na raiz (default), o escopo de busca foca exclusivamente nos diretórios do produto atual: `src`, `public` e `web_dashboard`.
- Permite passagem explícita de arquivos/diretórios via argumento posicional ou flags `--css-path` / `--css-dir`.

### 2.3. Parser Robusto de `:root` (Multiline e Inline)
- Função `parseCssViolations(cssContent, filePath)`:
  - Higieniza comentários (`/* ... */`) e literais de string preservando integralmente o comprimento de caracteres e as quebras de linha (`\n`), garantindo números de linha exatos.
  - Identifica blocos `:root` mesmo quando declarados em linha única, ex.:
    - `:root { --bg:#FFFFFF; --tint:#F7F8F8; }`
    - `:root[data-theme="dark"]{--bg:#0C0F13;--tint:#12161B;}`
    - `@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0C0F13;}}`
  - Dentro de `:root`, propriedades iniciadas com `--` (`--token: #hex;`) são reconhecidas como tokens válidos e não geram violação.
  - Propriedades comuns dentro de `:root` (ex.: `color: #123456`) ou propriedades com `#hex` fora de `:root` são flagradas com linha exata, valor hexadecimal e snippet do código.
  - Comentários com `#hex` são ignorados e não geram falsos positivos.

### 2.4. Modularização para Testabilidade
- O script exporta `parseCssViolations`, `scanCssForHexColors`, `DEFAULT_IGNORED_DIRS`, `DEFAULT_PRODUCT_DIRS`, `auditSummary`, etc.
- A função `main()` só é executada quando o script for chamado diretamente via CLI (`process.argv[1]`), permitindo que suites de teste em ESM importem as funções sem disparar o navegador ou process.exit prematuro.

---

## 3. Fixtures e Testes Automatizados Criados

### 3.1. Fixtures de Teste
1. `tests/fixtures/auditar_rotas_css_fixture.css`:
   - Demonstra `:root` multiline válido (0 violações);
   - Demonstra `:root` inline (single-line) válido (0 violações);
   - Demonstra `:root[data-theme="dark"]` inline válido (0 violações);
   - Demonstra `@media` com `:root` aninhado válido (0 violações);
   - Demonstra comentários com `#hex` (0 violações);
   - Contém 3 violações deliberadas fora de `:root` (`.alerta-erro` com `#B42318` e `#991B1B`; `.titulo-destaque` com `#123456`).
2. `tests/fixtures/auditar_rotas_css_clean.css`:
   - Fixture 100% conforme, contendo apenas tokens em `:root` (multiline e inline) e classes consumindo `var(...)`.

### 3.2. Suite de Testes Automatizada (`tests/auditar_rotas.test.mjs`)
Contém 13 testes cobrindo todos os cenários unitários e testes de integração de ponta a ponta via `spawnSync`:
- Reconhecimento de `:root` multiline sem falsos positivos.
- Reconhecimento de `:root` inline (single-line) sem falsos positivos.
- Reconhecimento de `:root` com atributo/pseudo-classe inline (`:root[data-theme="dark"]`).
- Reconhecimento de `:root` aninhado dentro de `@media`.
- Descarte de hexadecimais em comentários (linha única e bloco).
- Detecção precisa de hex fora de `:root` com linha e snippet.
- Detecção de propriedade comum dentro de `:root` como violação.
- Detecção de seletor descendente (`:root .card`) como violação.
- Lista expressa de diretórios ignorados (`DEFAULT_IGNORED_DIRS`).
- Validação da fixture limpa com zero violações.
- Detecção das 3 violações deliberadas na fixture de teste.
- **CLI Exit Code 0:** Execução com `--css-only` na fixture limpa sai com status 0, imprime "Auditoria de Rotas Concluída com Sucesso!" e "FAIL: 0".
- **CLI Exit Code 1:** Execução com `--css-only` na fixture com falhas sai com status 1, imprime "Auditoria Finalizada com FALHAS! (FAIL: 3, PASS: 0)", lista os nós ofensores e **NUNCA** emite a mensagem de sucesso.

---

## 4. Evidências da Execução

### 4.1. Execução do `npm test`
Execução completa da suite nativa (`node --test tests/*.test.mjs`):
```text
> dialisasus@1.0.0 test
> node --test tests/*.test.mjs

✔ parseCssViolations reconhece :root multiline sem falsos positivos (4.5694ms)
✔ parseCssViolations reconhece :root inline (single-line) sem falsos positivos (0.4986ms)
✔ parseCssViolations reconhece :root com pseudo-classe/atributo inline (0.2357ms)
✔ parseCssViolations reconhece :root aninhado dentro de @media (0.2295ms)
✔ parseCssViolations ignora hexadecimais em comentários (linha única e bloco) (0.4167ms)
✔ parseCssViolations detecta hexadecimais fora de :root com linha e snippet (4.1667ms)
✔ parseCssViolations detecta propriedade não-variável dentro de :root como violação (1.0992ms)
✔ parseCssViolations detecta seletor descendente de :root como violação (0.4857ms)
✔ scanCssForHexColors lista expressamente os diretórios que não são produto (0.4941ms)
✔ scanCssForHexColors valida fixture limpa com zero violações (2.6271ms)
✔ scanCssForHexColors detecta violações deliberadas na fixture de teste (2.3617ms)
✔ CLI sai com exit code 0 e mensagem de sucesso quando não há falhas (491.5739ms)
✔ CLI sai com exit code 1 e resumo de falhas quando há violações (481.3184ms)
✔ health informa o modo do agente (38.2636ms)
✔ pergunta clínica individual é recusada (0.8754ms)
✔ pergunta gerencial não é classificada como clínica (0.1531ms)
✔ fallback usa apenas o contexto recebido (0.3086ms)
✔ contexto excessivo é bloqueado (0.4669ms)
✔ resposta do Gemini é extraída sem expor a chave (1.3217ms)
✔ modelo alternativo é usado quando o principal não está disponível (1.7793ms)
ℹ tests 20
ℹ suites 0
ℹ pass 20
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1533.345
```

### 4.2. Execução Direta no Terminal (Comprovação Empírica de Exit Codes)

1. **Cenário Conforme (Fixture Limpa):**
   ```powershell
   node tools/auditar-rotas.mjs --css-only --css-path tests/fixtures/auditar_rotas_css_clean.css
   ```
   - **Saída:**
     ```text
     [1/5] Varredura de Design Tokens em Arquivos CSS
     Procurando cores em hexadecimal literal fora de :root (--token)...
     Arquivos CSS examinados: 1
     [PASS] 100% de conformidade com design tokens! Nenhuma cor literal fora de :root encontrada.

     Flag --css-only ativa. Etapas de navegador e rotas ignoradas.

     ====================================================================
       Auditoria de Rotas Concluída com Sucesso! (FAIL: 0, PASS: 1)  
     ====================================================================
     ```
   - **Exit code verificado (`$LASTEXITCODE`):** `0`

2. **Cenário com Falha (Fixture de Teste):**
   ```powershell
   node tools/auditar-rotas.mjs --css-only --css-path tests/fixtures/auditar_rotas_css_fixture.css
   ```
   - **Saída:**
     ```text
     [1/5] Varredura de Design Tokens em Arquivos CSS
     Procurando cores em hexadecimal literal fora de :root (--token)...
     Arquivos CSS examinados: 1
     [FAIL] Encontradas 3 ocorrência(s) de cores hexadecimais literais fora de design tokens!
       • tests/fixtures/auditar_rotas_css_fixture.css: 3 cores literais
         - Linha 45: #B42318 → "background-color: #B42318; /* VIOLAÇÃO 1 */"
         - Linha 46: #991B1B → "border: 1px solid #991B1B;  /* VIOLAÇÃO 2 */"
         - Linha 50: #123456 → "color: #123456;             /* VIOLAÇÃO 3 */"
     [FAIL] 3 cor(es) hexadecimal(is) literal(is) fora de :root
         Linha 45: #B42318; Linha 46: #991B1B; Linha 50: #123456
     → Recomendação soberana do Vault: substituir cores literais por tokens formais var(--token) em variables.css.

     Flag --css-only ativa. Etapas de navegador e rotas ignoradas.

     ====================================================================
       Auditoria Finalizada com FALHAS! (FAIL: 3, PASS: 0)  
     ====================================================================

     Resumo das Falhas Detectadas:
       1. [CSS_TOKENS] tests/fixtures/auditar_rotas_css_fixture.css: 3 cor(es) hexadecimal(is) literal(is) fora de :root
          Linha 45: #B42318; Linha 46: #991B1B; Linha 50: #123456

     Status: REPROVADO (Exit Code 1)
     ```
   - **Exit code verificado (`$LASTEXITCODE`):** `1`

---

## 5. Verificação dos Critérios de Aceite

| Critério de Aceite | Status | Evidência |
| :--- | :---: | :--- |
| `tools/auditar-rotas.mjs` sai com exit code 1 se houver `FAIL` | **CONCLUÍDO** | Comprovado via teste automatizado e `$LASTEXITCODE = 1` |
| Não emite mensagem de sucesso falso | **CONCLUÍDO** | `finishAudit` condiciona o banner estritamente a `totalFails === 0` |
| Ignora pastas de amostras e legado no scan de CSS | **CONCLUÍDO** | `DEFAULT_IGNORED_DIRS` e escopo default `src/`, `public/`, `web_dashboard/` |
| Aceita `:root` em uma linha e em múltiplas linhas sem falsos positivos | **CONCLUÍDO** | `parseCssViolations` validado unitariamente com 0 violações em inline e multiline |
| Fixture de teste demonstra o funcionamento correto | **CONCLUÍDO** | `tests/fixtures/auditar_rotas_css_fixture.css` e `auditar_rotas_css_clean.css` criadas |
| Handoff entregue com linhas `VAULT:` | **CONCLUÍDO** | Documento entregue com 5 linhas `VAULT:` mapeando as regras aplicadas |
| Nenhuma alteração em arquivos proibidos | **CONCLUÍDO** | `scripts/*`, `dados_tratados/*`, `dossie/*` e `tokens.json` intocados |
| Nenhum commit, push ou deploy | **CONCLUÍDO** | Nenhuma operação Git de commit, push ou deploy foi executada |
