import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

import {
  parseCssViolations,
  scanCssForHexColors,
  DEFAULT_IGNORED_DIRS,
  DEFAULT_PRODUCT_DIRS
} from '../tools/auditar-rotas.mjs';

// ============================================================================
// 1. PARSER DE :ROOT E CORES LITERAIS (UNITÁRIO)
// ============================================================================

test('parseCssViolations reconhece :root multiline sem falsos positivos', () => {
  const css = `
:root {
  --color-primary: #0B5D51;
  --color-secondary: #3F72E8;
  --color-surface: #FFFFFF;
}
  `;
  const violations = parseCssViolations(css);
  assert.equal(violations.length, 0, 'Não deve apontar violações em variáveis dentro de :root multiline');
});

test('parseCssViolations reconhece :root inline (single-line) sem falsos positivos', () => {
  const css = `:root { --bg:#FFFFFF; --tint:#F7F8F8; --ink:#12171D; }`;
  const violations = parseCssViolations(css);
  assert.equal(violations.length, 0, 'Não deve apontar violações em variáveis dentro de :root inline');
});

test('parseCssViolations reconhece :root com pseudo-classe/atributo inline', () => {
  const css = `:root[data-theme="dark"]{--bg:#0C0F13;--tint:#12161B;--ink:#EDEFF2;}`;
  const violations = parseCssViolations(css);
  assert.equal(violations.length, 0, 'Não deve apontar violações em :root[data-theme="dark"] inline');
});

test('parseCssViolations reconhece :root aninhado dentro de @media', () => {
  const css = `
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --media-bg: #0C0F13;
    --media-rule: #1D232B;
  }
}
  `;
  const violations = parseCssViolations(css);
  assert.equal(violations.length, 0, 'Não deve apontar violações em :root dentro de @media');
});

test('parseCssViolations ignora hexadecimais em comentários (linha única e bloco)', () => {
  const css = `
/* Hexadecimal em comentário: #B42318 #FFFFFF */
:root {
  --token: #0B5D51; /* inline comment: #123456 */
}
/*
  Paleta legada:
  #112233
*/
  `;
  const violations = parseCssViolations(css);
  assert.equal(violations.length, 0, 'Comentários com hexadecimais não podem ser tratados como violação');
});

test('parseCssViolations detecta hexadecimais fora de :root com linha e snippet', () => {
  const css = `
:root {
  --color-brand: #0B5D51;
}

.alerta-erro {
  background-color: #B42318;
  border-color: #991B1B;
}
  `;
  const violations = parseCssViolations(css);
  assert.equal(violations.length, 2, 'Deve registrar exatamente 2 violações');
  assert.equal(violations[0].line, 7);
  assert.equal(violations[0].hex, '#B42318');
  assert.match(violations[0].snippet, /background-color:\s*#B42318/);
  assert.equal(violations[1].line, 8);
  assert.equal(violations[1].hex, '#991B1B');
});

test('parseCssViolations detecta propriedade não-variável dentro de :root como violação', () => {
  const css = `
:root {
  --token-ok: #0B5D51;
  color: #123456;
}
  `;
  const violations = parseCssViolations(css);
  assert.equal(violations.length, 1, 'Propriedade CSS comum dentro de :root não é token e deve violar');
  assert.equal(violations[0].hex, '#123456');
});

test('parseCssViolations detecta seletor descendente de :root como violação', () => {
  const css = `
:root .card {
  color: #FF0000;
}
  `;
  const violations = parseCssViolations(css);
  assert.equal(violations.length, 1, ':root .card não é o seletor raiz de tokens e deve violar');
  assert.equal(violations[0].hex, '#FF0000');
});

// ============================================================================
// 2. SCANNER DE ARQUIVOS E FIXTURES
// ============================================================================

test('scanCssForHexColors lista expressamente os diretórios que não são produto', () => {
  const expectedIgnored = [
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
  for (const dir of expectedIgnored) {
    assert.ok(
      DEFAULT_IGNORED_DIRS.includes(dir),
      `DEFAULT_IGNORED_DIRS deve conter expressamente "${dir}"`
    );
  }
});

test('scanCssForHexColors valida fixture limpa com zero violações', () => {
  const fixtureClean = path.resolve('tests/fixtures/auditar_rotas_css_clean.css');
  const res = scanCssForHexColors(fixtureClean);
  assert.equal(res.cssFilesScanned, 1);
  assert.equal(res.totalHexFound, 0);
  assert.equal(res.fileResults[0].violationCount, 0);
});

test('scanCssForHexColors detecta violações deliberadas na fixture de teste', () => {
  const fixtureViolations = path.resolve('tests/fixtures/auditar_rotas_css_fixture.css');
  const res = scanCssForHexColors(fixtureViolations);
  assert.equal(res.cssFilesScanned, 1);
  assert.equal(res.totalHexFound, 3, 'Deve encontrar exatamente as 3 violações deliberadas');
  assert.equal(res.fileResults[0].violationCount, 3);
  
  const hexes = res.fileResults[0].violations.map(v => v.hex);
  assert.ok(hexes.includes('#B42318'), 'Deve conter #B42318');
  assert.ok(hexes.includes('#991B1B'), 'Deve conter #991B1B');
  assert.ok(hexes.includes('#123456'), 'Deve conter #123456');
});

// ============================================================================
// 3. INTEGRAÇÃO CLI: EXIT CODE E MENSAGENS DE STATUS
// ============================================================================

test('CLI sai com exit code 0 e mensagem de sucesso quando não há falhas', () => {
  const run = spawnSync('node', [
    'tools/auditar-rotas.mjs',
    '--css-only',
    '--css-path',
    'tests/fixtures/auditar_rotas_css_clean.css'
  ], { encoding: 'utf8' });

  assert.equal(run.status, 0, 'Exit code deve ser 0 quando tudo estiver conforme');
  assert.match(run.stdout, /Auditoria de Rotas Concluída com Sucesso!/);
  assert.match(run.stdout, /FAIL: 0/);
  assert.doesNotMatch(run.stdout, /Auditoria Finalizada com FALHAS!/);
});

test('CLI sai com exit code 1 e resumo de falhas quando há violações', () => {
  const run = spawnSync('node', [
    'tools/auditar-rotas.mjs',
    '--css-only',
    '--css-path',
    'tests/fixtures/auditar_rotas_css_fixture.css'
  ], { encoding: 'utf8' });

  assert.equal(run.status, 1, 'Exit code deve ser 1 quando houver qualquer FAIL');
  assert.match(run.stdout, /Auditoria Finalizada com FALHAS!/);
  assert.match(run.stdout, /FAIL: 3/);
  assert.match(run.stdout, /Status: REPROVADO \(Exit Code 1\)/);
  assert.match(run.stdout, /Resumo das Falhas Detectadas:/);
  assert.doesNotMatch(
    run.stdout,
    /Auditoria de Rotas Concluída com Sucesso!/,
    'NUNCA deve imprimir mensagem de sucesso quando houver falhas'
  );
});
