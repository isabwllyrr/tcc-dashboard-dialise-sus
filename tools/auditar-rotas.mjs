#!/usr/bin/env node
/**
 * tools/auditar-rotas.mjs
 *
 * Script de Auditoria Unificada de Rotas e Frontend (Axe Core, Overflow, Headings, SEO Semântico e Design Tokens)
 * Desenvolvido pelo papel Vistoria para automação e homologação contínua do DialisaSUS.
 *
 * Uso:
 *   node tools/auditar-rotas.mjs [url_ou_base] [opções]
 * 
 * Exemplos:
 *   node tools/auditar-rotas.mjs
 *   node tools/auditar-rotas.mjs            # audita o build local em http://127.0.0.1:4321/
 *   node tools/auditar-rotas.mjs <url>      # audita outro alvo
 *   node tools/auditar-rotas.mjs http://localhost:4321/ --routes / /explorar/ /previsao/ /assistente/ /triagem/ /metodologia/
 *   node tools/auditar-rotas.mjs --css-only
 *   node tools/auditar-rotas.mjs --css-only --css-path tests/fixtures/auditar_rotas_css_fixture.css
 *   node tools/auditar-rotas.mjs --json-out docs/evidencias/auditoria-rotas.json
 */

import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'fs';
import http from 'node:http';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURAÇÃO E ARGUMENTOS CLI ---
const args = process.argv.slice(2);

function getArg(flag, defaultValue = null) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return defaultValue;
}

const hasFlag = (flag) => args.includes(flag);

const DEFAULT_TARGET = 'http://127.0.0.1:4321/';

// Quando o alvo e local e nada esta escutando, sobe um servidor estatico sobre
// dist/ pela duracao da auditoria. Antes o alvo padrao era a v1 publicada, e
// rodar a ferramenta sem argumento auditava o produto errado.
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp',
  '.glb':'model/gltf-binary', '.woff2':'font/woff2' };

async function garantirServidor(target) {
  let url;
  try { url = new URL(target); } catch { return null; }
  if (!['127.0.0.1','localhost'].includes(url.hostname)) return null;
  try {
    const r = await fetch(target, { signal: AbortSignal.timeout(1500) });
    if (r.ok) return null;                       // ja tem alguem servindo
  } catch { /* ninguem escutando: subimos o nosso */ }

  const distDir = path.resolve('dist');
  if (!fs.existsSync(distDir)) {
    console.log(`${c.red}Sem servidor em ${target} e sem dist/. Rode "npm run build" antes.${c.reset}`);
    process.exit(1);
  }
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(distDir, rel);
    if (!file.startsWith(distDir)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end('nao encontrado'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((ok, err) => server.listen(Number(url.port) || 80, url.hostname, ok).on('error', err));
  console.log(`${c.dim}Servidor local iniciado sobre dist/ em ${target}${c.reset}`);
  return server;
}

const isCssOnly = hasFlag('--css-only');
const jsonOutPath = getArg('--json-out', null);
const cssPathArg = getArg('--css-path', null) || getArg('--css-dir', null);

let targetArg = DEFAULT_TARGET;
let routesToAudit = [];

const CANONICAL_PATHS = [
  '/',
  '/evidencias/valor/',
  '/evidencias/contagem/',
  '/evidencias/territorio/',
  '/evidencias/modelo/',
  '/sobre-a-base/',
  '/assistente/'
];

if (hasFlag('--canonical') || hasFlag('--onda2')) {
  const base = args.find(a => a.startsWith('http')) || DEFAULT_TARGET;
  targetArg = base;
  routesToAudit = CANONICAL_PATHS.map(p => new URL(p, base).href);
} else {
  const routesIdx = args.indexOf('--routes');
  if (routesIdx !== -1) {
    const base = args.find(a => !a.startsWith('-')) || DEFAULT_TARGET;
    targetArg = base;
    for (let i = routesIdx + 1; i < args.length; i++) {
      if (args[i].startsWith('-')) break;
      try {
        const fullUrl = new URL(args[i], base).href;
        routesToAudit.push(fullUrl);
      } catch {
        routesToAudit.push(args[i]);
      }
    }
  } else {
    const nonFlagArgs = args.filter(a => !a.startsWith('-'));
    if (nonFlagArgs.length > 0) {
      targetArg = nonFlagArgs[0];
    }
    routesToAudit = [targetArg];
  }
}

const VIEWPORTS = [
  { name: '320px (Mobile Mínimo)', width: 320, height: 568 },
  { name: '375px (Mobile Padrão)', width: 375, height: 667 },
  { name: '768px (Tablet Portrait)', width: 768, height: 1024 },
  { name: '1024px (Tablet / Laptop)', width: 1024, height: 768 },
  { name: '1440px (Desktop Padrão)', width: 1440, height: 900 }
];

// ANSI Cores para saída estruturada no terminal
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const BADGES = {
  pass: `${c.green}${c.bold}[PASS]${c.reset}`,
  fail: `${c.red}${c.bold}[FAIL]${c.reset}`,
  warn: `${c.yellow}${c.bold}[WARN]${c.reset}`,
  info: `${c.blue}${c.bold}[INFO]${c.reset}`,
};

// ============================================================================
// CONTROLE E REGISTRO ESTRITO DE STATUS / FALHAS
// ============================================================================
let servidorLocal = null;
const auditSummary = {
  totalFails: 0,
  totalPasses: 0,
  totalWarnings: 0,
  failures: []
};

function recordPass(msg) {
  auditSummary.totalPasses++;
  console.log(`${BADGES.pass} ${msg}`);
}

function recordFail(category, route, message, detail = null, failCount = 1) {
  auditSummary.totalFails += failCount;
  auditSummary.failures.push({ category, route, message, detail, count: failCount });
  console.log(`${BADGES.fail} ${message}`);
  if (detail) {
    console.log(`    ${detail}`);
  }
}

function recordWarn(msg) {
  auditSummary.totalWarnings++;
  console.log(`${BADGES.warn} ${msg}`);
}

// ============================================================================
// VERIFICAÇÃO 1 / SCANNER ROBUSTO DE DESIGN TOKENS EM ARQUIVOS CSS
// ============================================================================
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

const DEFAULT_PRODUCT_DIRS = ['src', 'public'];

/**
 * Analisa o conteúdo CSS em busca de cores hexadecimais literais fora de declarações de variáveis em :root.
 * Suporta :root multiline e inline, comentários e at-rules como @media.
 *
 * @param {string} cssContent Conteúdo do arquivo CSS
 * @param {string} [filePath=''] Caminho opcional do arquivo para identificação
 * @returns {Array<{ line: number, hex: string, snippet: string }>} Lista de violações encontradas
 */
function parseCssViolations(cssContent, filePath = '') {
  const lines = cssContent.split(/\r?\n/);

  // Etapa 1: Substituir comentários e strings por espaços, preservando exatamente tamanho e quebras de linha
  let cleanContent = '';
  let inComment = false;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < cssContent.length; i++) {
    const ch = cssContent[i];
    const nextCh = cssContent[i + 1] || '';

    if (inComment) {
      if (ch === '*' && nextCh === '/') {
        cleanContent += '  ';
        i++;
        inComment = false;
      } else {
        cleanContent += ch === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if (inString) {
      if (ch === '\\') {
        cleanContent += '  ';
        i++;
      } else if (ch === stringChar) {
        cleanContent += ' ';
        inString = false;
      } else {
        cleanContent += ch === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if (ch === '/' && nextCh === '*') {
      cleanContent += '  ';
      i++;
      inComment = true;
      continue;
    }

    if (ch === '"' || ch === "'") {
      cleanContent += ' ';
      inString = true;
      stringChar = ch;
      continue;
    }

    cleanContent += ch;
  }

  // Mapeamento de índices de início de linha para busca binária rápida
  const lineStarts = [0];
  for (let i = 0; i < cssContent.length; i++) {
    if (cssContent[i] === '\n') {
      lineStarts.push(i + 1);
    }
  }

  function getLineNumber(index) {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineStarts[mid] <= index) {
        if (mid === lineStarts.length - 1 || lineStarts[mid + 1] > index) {
          return mid + 1; // 1-indexado
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return 1;
  }

  function isRootSelector(selector) {
    if (!selector) return false;
    const parts = selector.split(',');
    return parts.some(part => {
      const p = part.trim();
      if (!/:root\b/.test(p)) return false;
      // :root deve ser o sujeito da regra, não um ancestral (ex: :root .card não é definição de raiz)
      if (/:root\s+[^,\s]/.test(p)) return false;
      if (/:root\s*>[^,\s]/.test(p)) return false;
      if (/:root\s*\+[^,\s]/.test(p)) return false;
      if (/:root\s*~[^,\s]/.test(p)) return false;
      return true;
    });
  }

  const violations = [];
  const stack = []; // frames: { selector: string, isRoot: boolean }
  let buffer = '';
  let bufferStartIdx = 0;

  function processDeclaration(declText, startIdx) {
    const trimmed = declText.trim();
    if (!trimmed) return;

    const currentFrame = stack.length > 0 ? stack[stack.length - 1] : null;
    const insideRoot = currentFrame ? currentFrame.isRoot : false;

    const colonIdx = declText.indexOf(':');
    let isTokenDefinition = false;
    if (colonIdx !== -1) {
      const propName = declText.slice(0, colonIdx).trim();
      if (insideRoot && propName.startsWith('--')) {
        isTokenDefinition = true;
      }
    }

    if (!isTokenDefinition) {
      const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
      let match;
      while ((match = hexRegex.exec(declText)) !== null) {
        const hex = match[0];
        const charIdx = startIdx + match.index;
        const lineNum = getLineNumber(charIdx);
        const snippet = lines[lineNum - 1] ? lines[lineNum - 1].trim() : '';
        violations.push({
          line: lineNum,
          hex,
          snippet
        });
      }
    }
  }

  for (let i = 0; i < cleanContent.length; i++) {
    const ch = cleanContent[i];

    if (ch === '{') {
      const selector = buffer.trim();
      const isRoot = isRootSelector(selector);
      stack.push({ selector, isRoot });
      buffer = '';
      bufferStartIdx = i + 1;
    } else if (ch === '}') {
      if (buffer.trim()) {
        processDeclaration(buffer, bufferStartIdx);
      }
      buffer = '';
      bufferStartIdx = i + 1;
      if (stack.length > 0) {
        stack.pop();
      }
    } else if (ch === ';') {
      if (stack.length > 0) {
        processDeclaration(buffer, bufferStartIdx);
      }
      buffer = '';
      bufferStartIdx = i + 1;
    } else {
      if (buffer === '') {
        bufferStartIdx = i;
      }
      buffer += ch;
    }
  }

  return violations;
}

/**
 * Realiza varredura de arquivos CSS, limitando o escopo ao produto atual e ignorando amostras/legado.
 *
 * @param {string} [targetPath='.'] Diretório ou arquivo alvo
 * @param {object} [options={}] Opções de configuração
 * @returns {{ cssFilesScanned: number, totalHexFound: number, fileResults: Array }}
 */
function scanCssForHexColors(targetPath = '.', options = {}) {
  const cssFiles = [];
  const ignored = options.ignored || DEFAULT_IGNORED_DIRS;

  function shouldIgnore(fullPath) {
    const rel = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
    const baseName = path.basename(fullPath);
    return ignored.some(item => {
      const normItem = item.replace(/\\/g, '/');
      return rel === normItem ||
             rel.startsWith(normItem + '/') ||
             baseName === normItem;
    });
  }

  function findCss(target) {
    if (!fs.existsSync(target)) return;
    const stat = fs.statSync(target);
    if (stat.isFile()) {
      if (target.endsWith('.css')) {
        cssFiles.push(path.resolve(target));
      }
      return;
    }

    if (stat.isDirectory()) {
      const entries = fs.readdirSync(target, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(target, entry.name);
        if (entry.isDirectory()) {
          if (!shouldIgnore(full)) {
            findCss(full);
          }
        } else if (entry.isFile() && entry.name.endsWith('.css')) {
          if (!shouldIgnore(full)) {
            cssFiles.push(path.resolve(full));
          }
        }
      }
    }
  }

  // Se o alvo for a raiz (default), foca exclusivamente nos diretórios do produto atual
  if (targetPath === '.' || targetPath === './') {
    const productDirs = options.productDirs || DEFAULT_PRODUCT_DIRS;
    let scannedAny = false;
    for (const dir of productDirs) {
      if (fs.existsSync(dir)) {
        findCss(dir);
        scannedAny = true;
      }
    }
    if (!scannedAny) {
      findCss('.');
    }
  } else {
    findCss(targetPath);
  }

  const results = [];
  let totalHexFound = 0;

  for (const file of cssFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const fileViolations = parseCssViolations(content, file);
    totalHexFound += fileViolations.length;

    results.push({
      file,
      relativeFile: path.relative(process.cwd(), file).replace(/\\/g, '/'),
      violationCount: fileViolations.length,
      violations: fileViolations
    });
  }

  return {
    cssFilesScanned: cssFiles.length,
    totalHexFound,
    fileResults: results
  };
}

// ============================================================================
// FINALIZAÇÃO, RESUMO E EMISSÃO DE EXIT CODE
// ============================================================================
function finishAudit(report) {
  if (jsonOutPath) {
    const outResolved = path.resolve(jsonOutPath);
    const dir = path.dirname(outResolved);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    report.summary = {
      totalPasses: auditSummary.totalPasses,
      totalFails: auditSummary.totalFails,
      totalWarnings: auditSummary.totalWarnings,
      failures: auditSummary.failures
    };
    fs.writeFileSync(outResolved, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n${c.green}✓ Relatório JSON estruturado salvo em: ${outResolved}${c.reset}`);
  }

  if (auditSummary.totalFails > 0) {
    console.log(`\n${c.bold}${c.red}====================================================================${c.reset}`);
    console.log(`${c.bold}${c.red}  Auditoria Finalizada com FALHAS! (FAIL: ${auditSummary.totalFails}, PASS: ${auditSummary.totalPasses})  ${c.reset}`);
    console.log(`${c.bold}${c.red}====================================================================${c.reset}\n`);
    console.log(`${c.bold}Resumo das Falhas Detectadas:${c.reset}`);
    auditSummary.failures.forEach((f, i) => {
      console.log(`  ${i + 1}. [${f.category}] ${f.route ? f.route + ': ' : ''}${f.message}`);
      if (f.detail) console.log(`     ${c.dim}${f.detail}${c.reset}`);
    });
    console.log(`\n${c.red}Status: REPROVADO (Exit Code 1)${c.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${c.bold}${c.green}====================================================================${c.reset}`);
    console.log(`${c.bold}${c.green}  Auditoria de Rotas Concluída com Sucesso! (FAIL: 0, PASS: ${auditSummary.totalPasses})  ${c.reset}`);
    console.log(`${c.bold}${c.green}====================================================================${c.reset}\n`);
    process.exit(0);
  }
}

// ============================================================================
// FLUXO PRINCIPAL DE AUDITORIA
// ============================================================================
async function main() {
  console.log(`\n${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  DialisaSUS · Ferramenta de Auditoria Unificada de Rotas (Vistoria)  ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================================${c.reset}\n`);

  const report = {
    date: new Date().toISOString(),
    targetUrl: targetArg,
    cssScan: null,
    routes: []
  };

  // --- ETAPA 1: Varredura de CSS por Hexadecimal Literal ---
  console.log(`${c.bold}[1/5] Varredura de Design Tokens em Arquivos CSS${c.reset}`);
  console.log(`${c.dim}Procurando cores em hexadecimal literal fora de :root (--token)...${c.reset}`);

  const effectiveCssPath = cssPathArg || (targetArg && targetArg.endsWith('.css') ? targetArg : (targetArg && targetArg.startsWith('http') && fs.existsSync('public/assets/style.css') ? 'public/assets/style.css' : '.'));
  const cssScan = scanCssForHexColors(effectiveCssPath);
  report.cssScan = cssScan;

  console.log(`Arquivos CSS examinados: ${cssScan.cssFilesScanned}`);
  if (cssScan.totalHexFound === 0) {
    recordPass(`100% de conformidade com design tokens! Nenhuma cor literal fora de :root encontrada.\n`);
  } else {
    console.log(`${BADGES.fail} Encontradas ${c.bold}${c.red}${cssScan.totalHexFound}${c.reset} ocorrência(s) de cores hexadecimais literais fora de design tokens!`);
    for (const fr of cssScan.fileResults) {
      if (fr.violationCount > 0) {
        console.log(`  • ${c.bold}${fr.relativeFile}${c.reset}: ${fr.violationCount} cores literais`);
        fr.violations.slice(0, 3).forEach(v => {
          console.log(`    - Linha ${v.line}: ${c.red}${v.hex}${c.reset} → "${v.snippet.slice(0, 60)}"`);
        });
        if (fr.violationCount > 3) {
          console.log(`    ${c.dim}... e mais ${fr.violationCount - 3} ocorrências.${c.reset}`);
        }
        recordFail(
          'CSS_TOKENS',
          fr.relativeFile,
          `${fr.violationCount} cor(es) hexadecimal(is) literal(is) fora de :root`,
          fr.violations.slice(0, 3).map(v => `Linha ${v.line}: ${v.hex}`).join('; '),
          fr.violationCount
        );
      }
    }
    console.log(`${c.yellow}→ Recomendação soberana do Vault: substituir cores literais por tokens formais var(--token) em variables.css.${c.reset}\n`);
  }

  if (isCssOnly) {
    console.log(`${c.dim}Flag --css-only ativa. Etapas de navegador e rotas ignoradas.${c.reset}`);
    finishAudit(report);
    return;
  }

  // --- INICIAR NAVEGADOR PLAYWRIGHT ---
  console.log(`${c.bold}[2/5] Inicializando Navegador Headless (Playwright / Chromium)${c.reset}`);
  let browser;
  try {
    servidorLocal = await garantirServidor(targetArg);
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (e) {
    try {
      browser = await chromium.launch({ headless: true });
    } catch (e2) {
      recordFail('BROWSER', targetArg, `Falha ao inicializar Chromium: ${e2.message}`);
      finishAudit(report);
      return;
    }
  }

  for (const currentUrl of routesToAudit) {
    console.log(`\n${c.bold}${c.cyan}--- Auditando URL: ${currentUrl} ---${c.reset}\n`);
    const routeReport = {
      url: currentUrl,
      headings: null,
      seo: null,
      overflow: {},
      accessibility: null
    };

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    try {
      await page.goto(currentUrl, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(3000); // aguardar animação/splash inicial
    } catch (err) {
      recordFail('NAVIGATION', currentUrl, `Erro ao carregar página: ${err.message}`);
      await context.close();
      continue;
    }

    // --- ETAPA 2: Hierarquia de Cabeçalhos (h1 único) ---
    console.log(`${c.bold}[3/5] Validação de Hierarquia de Cabeçalhos (Heading Order)${c.reset}`);
    const headingData = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
        tag: h.tagName.toLowerCase(),
        level: parseInt(h.tagName[1], 10),
        text: (h.innerText || h.textContent || '').trim().replace(/\s+/g, ' '),
        isVisible: !!(h.offsetWidth || h.offsetHeight || h.getClientRects().length)
      }));

      const h1s = headings.filter(h => h.tag === 'h1');
      return {
        totalHeadings: headings.length,
        h1Count: h1s.length,
        h1List: h1s,
        allHeadings: headings
      };
    });

    routeReport.headings = headingData;

    if (headingData.h1Count === 1) {
      recordPass(`<h1> único identificado: "${headingData.h1List[0].text}"`);
    } else if (headingData.h1Count === 0) {
      recordFail('HEADINGS', currentUrl, 'Nenhum elemento <h1> encontrado na página!');
    } else {
      recordFail('HEADINGS', currentUrl, `Múltiplos elementos <h1> encontrados (${headingData.h1Count} no total)!`);
      headingData.h1List.forEach((h1, i) => {
        console.log(`  ${i + 1}. <h1${h1.isVisible ? '' : ' (oculto)'}>: "${h1.text}"`);
      });
      console.log(`  ${c.yellow}→ Diretriz: Uma página deve possuir exatamente 1 <h1> semântico como tema central.${c.reset}`);
    }

    // --- ETAPA 3: SEO Semântico (Canonical e JSON-LD) ---
    console.log(`\n${c.bold}[4/5] Integridade de Meta Tag Canonical e JSON-LD${c.reset}`);
    const seoData = await page.evaluate(() => {
      const canonical = document.querySelector('link[rel="canonical"]');
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      
      const jsonLdParsed = [];
      const jsonLdErrors = [];
      for (const s of jsonLdScripts) {
        try {
          const parsed = JSON.parse(s.textContent);
          jsonLdParsed.push(parsed);
        } catch (e) {
          jsonLdErrors.push({ error: e.message, raw: s.textContent.slice(0, 100) });
        }
      }

      return {
        hasCanonical: !!canonical,
        canonicalHref: canonical ? canonical.getAttribute('href') : null,
        jsonLdCount: jsonLdScripts.length,
        jsonLdParsed,
        jsonLdErrors
      };
    });

    routeReport.seo = seoData;

    if (seoData.hasCanonical) {
      recordPass(`Canonical presente: ${seoData.canonicalHref}`);
    } else {
      recordFail('CANONICAL', currentUrl, 'Tag <link rel="canonical"> ausente.');
    }

    if (seoData.jsonLdCount > 0 && seoData.jsonLdErrors.length === 0) {
      recordPass(`JSON-LD estruturado presente (${seoData.jsonLdCount} bloco(s) válido(s)).`);
      seoData.jsonLdParsed.forEach(schema => {
        console.log(`  • @type: ${schema['@type'] || 'Não declarado'} | @context: ${schema['@context'] || 'N/A'}`);
      });
    } else if (seoData.jsonLdErrors.length > 0) {
      recordFail('JSON_LD', currentUrl, `Erro no parse do JSON-LD: ${seoData.jsonLdErrors[0].error}`);
    } else {
      recordWarn('Nenhum bloco de dados estruturados JSON-LD (<script type="application/ld+json">) encontrado.');
    }

    // --- ETAPA 3b: Ressalva de Contagem e Zero Client JS ---
    const routeSemantics = await page.evaluate(() => {
      const guards = Array.from(document.querySelectorAll('.guard, .note, [data-guard]')).map(el => (el.innerText || '').trim());
      const hasCountWarning = guards.some(g =>
        /procedimentos?\s+aprovados?.*não\s+(pessoas|pacientes)/i.test(g) ||
        /procedimentos?,?\s+não\s+(pessoas|pacientes)/i.test(g) ||
        /procedimentos?\s+não\s+são\s+pacientes/i.test(g)
      );

      const scripts = Array.from(document.querySelectorAll('script'));
      const clientScripts = scripts
        .filter(s => s.type !== 'application/ld+json' && !s.src.includes('kidney.js') && !s.type.includes('importmap'))
        .map(s => s.src || s.innerHTML.slice(0, 50));

      return {
        hasCountWarning,
        sampleGuard: guards[0] || null,
        clientScriptCount: clientScripts.length
      };
    });

    if (currentUrl.includes('/evidencias/')) {
      if (routeSemantics.hasCountWarning) {
        recordPass('Ressalva obrigatória de contagem presente antes dos dados.');
      } else {
        recordWarn('Aviso de contagem não detectado com fórmula canônica.');
      }
    }

    if (!currentUrl.endsWith('/') || currentUrl.includes('/evidencias/') || currentUrl.includes('/sobre-a-base/') || currentUrl.includes('/assistente/')) {
      if (routeSemantics.clientScriptCount === 0) {
        recordPass('0 client-side runtime JavaScript nesta rota analítica.');
      }
    }

    // --- ETAPA 4: Bateria Axe Core de Acessibilidade ---
    console.log(`\n${c.bold}[5a/5] Bateria Axe Core de Acessibilidade (WCAG 2.1 AA)${c.reset}`);
    console.log(`${c.dim}Executando varredura automatizada com AxeBuilder...${c.reset}`);
    
    try {
      const axe = new AxeBuilder({ page });
      const skipContrast = hasFlag('--skip-contrast') || hasFlag('--ignore-contrast');
      if (skipContrast) {
        axe.disableRules(['color-contrast']);
      }
      const axeResults = await axe.analyze();
      
      const structuralViolations = axeResults.violations.filter(v => v.id !== 'color-contrast');
      const contrastViolations = axeResults.violations.filter(v => v.id === 'color-contrast');

      const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
      axeResults.violations.forEach(v => {
        if (byImpact[v.impact] !== undefined) byImpact[v.impact] += v.nodes.length;
      });

      routeReport.accessibility = {
        totalViolations: axeResults.violations.length,
        structuralViolations: structuralViolations.length,
        contrastViolations: contrastViolations.length,
        totalNodesAffected: axeResults.violations.reduce((acc, v) => acc + v.nodes.length, 0),
        byImpact,
        violations: axeResults.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodesCount: v.nodes.length,
          sampleTarget: v.nodes[0] ? v.nodes[0].target : []
        }))
      };

      if (structuralViolations.length === 0) {
        if (contrastViolations.length > 0 && !hasFlag('--strict-contrast')) {
          recordPass('Zero violações estruturais de acessibilidade detectadas pelo axe-core!');
          recordWarn(`[SOBERANIA-TOKENS] ${contrastViolations[0].nodes.length} nós com contraste de token (--ink3: #7B8692) registrados como fricção estética conforme DECISAO-SOBERANIA-DOS-DESIGN-TOKENS.`);
        } else if (contrastViolations.length > 0 && hasFlag('--strict-contrast')) {
          recordFail('AXE_CORE', currentUrl, `Violação de contraste estrito detectada: ${contrastViolations[0].nodes.length} nós.`);
        } else {
          recordPass('Zero violações de acessibilidade detectadas pelo axe-core!');
        }
      } else {
        recordFail('AXE_CORE', currentUrl, `${structuralViolations.length} regra(s) estrutural(is) de acessibilidade violada(s), impactando ${structuralViolations.reduce((acc, v) => acc + v.nodes.length, 0)} nós no DOM.`);
        console.log(`  - Crítico: ${byImpact.critical} | Grave (Serious): ${byImpact.serious} | Moderado: ${byImpact.moderate} | Menor: ${byImpact.minor}`);
        
        structuralViolations.forEach(v => {
          const badge = v.impact === 'critical' || v.impact === 'serious' ? BADGES.fail : BADGES.warn;
          console.log(`  ${badge} ${c.bold}${v.id}${c.reset} (${v.impact}): ${v.description} [${v.nodes.length} nós afetados]`);
        });
      }
    } catch (e) {
      recordFail('AXE_CORE', currentUrl, `Falha na execução do axe-core: ${e.message}`);
    }

    await context.close();

    // --- ETAPA 5: Medição de Overflow Horizontal em Viewports Canônicos ---
    console.log(`\n${c.bold}[5b/5] Homologação de Overflow Horizontal em Viewports Canônicos${c.reset}`);

    for (const vp of VIEWPORTS) {
      const vpContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const vpPage = await vpContext.newPage();
      try {
        await vpPage.goto(currentUrl, { waitUntil: 'load' });
        await vpPage.waitForTimeout(2500);

        const overflowCheck = await vpPage.evaluate(() => {
          const scrollWidth = document.documentElement.scrollWidth;
          const innerWidth = window.innerWidth;
          const delta = scrollWidth - innerWidth;
          const hasOverflow = delta > 0.5;

          let sampleOffenders = [];
          if (hasOverflow) {
            const all = document.querySelectorAll('*');
            for (const el of all) {
              const r = el.getBoundingClientRect();
              if (r.right > innerWidth + 0.5 || el.scrollWidth > innerWidth + 0.5) {
                sampleOffenders.push({
                  tag: el.tagName.toLowerCase(),
                  id: el.id || '',
                  class: typeof el.className === 'string' ? el.className.trim() : '',
                  scrollWidth: el.scrollWidth,
                  right: Math.round(r.right)
                });
              }
            }
          }

          return { scrollWidth, innerWidth, delta, hasOverflow, offenders: sampleOffenders.slice(0, 5) };
        });

        routeReport.overflow[vp.name] = overflowCheck;

        if (!overflowCheck.hasOverflow) {
          recordPass(`Viewport ${vp.name.padEnd(26)}: scrollWidth=${overflowCheck.scrollWidth}px == innerWidth=${overflowCheck.innerWidth}px (Δ = 0px)`);
        } else {
          recordFail('OVERFLOW', currentUrl, `Viewport ${vp.name.padEnd(26)}: scrollWidth=${overflowCheck.scrollWidth}px > innerWidth=${overflowCheck.innerWidth}px (Δ = +${overflowCheck.delta}px)`);
          if (overflowCheck.offenders.length > 0) {
            overflowCheck.offenders.forEach(o => {
              console.log(`    -> Nó ofensor: <${o.tag}${o.id ? '#' + o.id : ''}${o.class ? '.' + o.class : ''}> (scrollWidth=${o.scrollWidth}px, right=${o.right}px)`);
            });
          }
        }
      } catch (e) {
        recordFail('OVERFLOW', currentUrl, `Falha ao medir overflow no viewport ${vp.name}: ${e.message}`);
      } finally {
        await vpContext.close();
      }
    }

    report.routes.push(routeReport);
  }

  await browser.close();
  finishAudit(report);
}

export {
  parseCssViolations,
  scanCssForHexColors,
  main,
  finishAudit,
  auditSummary,
  BADGES,
  VIEWPORTS,
  DEFAULT_IGNORED_DIRS,
  DEFAULT_PRODUCT_DIRS
};

const isDirectRun = process.argv[1] && (
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('auditar-rotas.mjs')
);

if (isDirectRun) {
  main().catch(err => {
    console.error(`${BADGES.fail} Erro fatal na auditoria:`, err);
    process.exit(1);
  });
}
