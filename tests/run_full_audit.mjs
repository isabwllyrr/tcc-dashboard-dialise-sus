import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const PORT = 4321;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

function createStaticServer(distDir) {
  return http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath.endsWith('/')) reqPath += 'index.html';
    let filePath = path.join(distDir, reqPath);
    if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) filePath += '.html';
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found: ' + reqPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

const VIEWPORTS = [
  { name: '320px', width: 320, height: 568 },
  { name: '375px', width: 375, height: 667 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1024px', width: 1024, height: 768 },
  { name: '1440px', width: 1440, height: 900 }
];

const CANONICAL_ROUTES = [
  { path: '/', name: 'Home / Relatório Vivo' },
  { path: '/evidencias/valor/', name: 'Evidência 1: Valor Aprovado e IPCA' },
  { path: '/evidencias/contagem/', name: 'Evidência 2: Contagem e Pacientes Estimados' },
  { path: '/evidencias/territorio/', name: 'Evidência 3: Território Nacional' },
  { path: '/evidencias/modelo/', name: 'Evidência 4: Projeção Preditiva' },
  { path: '/sobre-a-base/', name: 'Sobre a Base e Glossário' },
  { path: '/assistente/', name: 'Assistente Netlify' }
];

const SAMPLE_UFS = ['sp', 'rj', 'mg', 'ba', 'am', 'rs', 'pe'];

async function run() {
  const distDir = path.resolve('dist');
  if (!fs.existsSync(distDir)) {
    console.error('dist/ não existe! Execute npm run build primeiro.');
    process.exit(1);
  }

  // Ensure screenshots directory exists
  const screenshotDir = path.resolve('docs/evidencias/onda2');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const server = createStaticServer(distDir);
  await new Promise(resolve => server.listen(PORT, HOST, resolve));
  console.log(`[HTTP Server] Ativo em ${BASE_URL} sobre ${distDir}`);

  const browser = await chromium.launch({ headless: true });
  const results = {
    canonicalRoutes: [],
    ufSampleRoutes: [],
    jsRuntimeCheck: [],
    summary: {
      totalRoutes: 0,
      overflowZeroCount: 0,
      singleH1Count: 0,
      guardCount: 0,
      zeroJsAnalyticalCount: 0,
      axeStructuralZeroCount: 0,
      ink3ContrastCount: 0
    }
  };

  // 1. Audit Client-Side JS in HTML files across all 34 routes in dist/
  console.log('\n--- 1. Auditoria de Runtime JavaScript (dist/*.html) ---');
  function findHtmlFiles(dir) {
    const list = [];
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) list.push(...findHtmlFiles(p));
      else if (f.name.endsWith('.html')) list.push(p);
    }
    return list;
  }

  const allHtml = findHtmlFiles(distDir);
  for (const htmlPath of allHtml) {
    const content = fs.readFileSync(htmlPath, 'utf8');
    const rel = path.relative(distDir, htmlPath).replace(/\\/g, '/');
    const isHome = rel === 'index.html';
    
    // Count <script> tags
    const scriptMatches = content.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
    const clientScripts = scriptMatches.filter(s => !s.includes('application/ld+json'));
    
    results.jsRuntimeCheck.push({
      file: rel,
      isHome,
      clientScriptCount: clientScripts.length,
      scripts: clientScripts.map(s => s.slice(0, 80))
    });

    if (!isHome && clientScripts.length === 0) {
      results.summary.zeroJsAnalyticalCount++;
    }
  }
  console.log(`Total de arquivos HTML em dist/: ${allHtml.length}`);
  console.log(`Rotas analíticas com 0 client-side JS: ${results.summary.zeroJsAnalyticalCount}/33`);

  // 2. Audit 7 Canonical Routes
  console.log('\n--- 2. Auditoria das 7 Rotas Canônicas ---');
  for (const route of CANONICAL_ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    console.log(`\nAuditando: ${route.name} (${route.path})`);

    const routeData = {
      path: route.path,
      name: route.name,
      h1: null,
      h1Count: 0,
      canonical: null,
      guardPresent: false,
      guardText: null,
      overflow: {},
      axe: {
        totalViolations: 0,
        structuralViolations: 0,
        contrastViolations: 0,
        contrastNodes: 0,
        details: []
      },
      screenshots: {}
    };

    // A. Metadata, Headings, Guard & Axe Core
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    // Headings
    const h1s = await page.$$eval('h1', els => els.map(e => e.innerText.trim()));
    routeData.h1Count = h1s.length;
    routeData.h1 = h1s[0] || null;

    // Canonical
    routeData.canonical = await page.$eval('link[rel="canonical"]', el => el.href).catch(() => null);

    // Guard (Ressalva de contagem)
    const guards = await page.$$eval('.guard, .note, [data-guard]', els => els.map(e => e.innerText.trim()));
    const countWarning = guards.find(g => /procedimentos?\s+aprovados?.*não\s+(pessoas|pacientes)/i.test(g) || /procedimentos?,?\s+não\s+(pessoas|pacientes)/i.test(g));
    routeData.guardPresent = !!countWarning;
    routeData.guardText = countWarning || (guards[0] || null);

    // Axe Core
    const axe = new AxeBuilder({ page });
    const axeRes = await axe.analyze();
    routeData.axe.totalViolations = axeRes.violations.length;

    for (const v of axeRes.violations) {
      if (v.id === 'color-contrast') {
        routeData.axe.contrastViolations++;
        routeData.axe.contrastNodes += v.nodes.length;
      } else {
        routeData.axe.structuralViolations++;
        routeData.axe.details.push({ id: v.id, impact: v.impact, nodes: v.nodes.length });
      }
    }

    // Screenshots
    // Desktop 1440px
    const slug = route.path === '/' ? 'home' : route.path.replace(/^\/|\/$/g, '').replace(/\//g, '-');
    const desktopShot = path.join(screenshotDir, `${slug}-desktop-1440.png`);
    await page.screenshot({ path: desktopShot, fullPage: true });
    routeData.screenshots['1440px'] = path.relative(process.cwd(), desktopShot).replace(/\\/g, '/');

    // Mobile 390px (Canônico do projeto)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    const mobileShot = path.join(screenshotDir, `${slug}-mobile-390.png`);
    await page.screenshot({ path: mobileShot, fullPage: true });
    routeData.screenshots['390px'] = path.relative(process.cwd(), mobileShot).replace(/\\/g, '/');

    await context.close();

    // B. Multi-viewport overflow audit across the 5 viewports
    for (const vp of VIEWPORTS) {
      const vpContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const vpPage = await vpContext.newPage();
      await vpPage.goto(url, { waitUntil: 'load' });
      await vpPage.waitForTimeout(1000);

      const overflow = await vpPage.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const delta = scrollWidth - innerWidth;
        return { scrollWidth, innerWidth, delta, hasOverflow: delta > 0.5 };
      });

      routeData.overflow[vp.name] = overflow;
      await vpContext.close();
    }

    results.canonicalRoutes.push(routeData);

    const allZero = Object.values(routeData.overflow).every(o => !o.hasOverflow);
    console.log(`  h1 único (${routeData.h1Count === 1 ? 'PASS' : 'FAIL'}): "${routeData.h1}"`);
    console.log(`  Canonical (${routeData.canonical ? 'PASS' : 'FAIL'}): ${routeData.canonical}`);
    console.log(`  Ressalva contagem (${routeData.guardPresent ? 'PASS' : 'WARN'}): ${routeData.guardText?.slice(0, 60)}...`);
    console.log(`  Axe structural (${routeData.axe.structuralViolations === 0 ? 'PASS' : 'FAIL'}): ${routeData.axe.structuralViolations} violations`);
    console.log(`  Axe ink3 contrast (Friction note): ${routeData.axe.contrastNodes} nodes`);
    console.log(`  Overflow 5 viewports (${allZero ? 'PASS Δ=0' : 'FAIL'}): 320px=${routeData.overflow['320px'].delta}px, 375px=${routeData.overflow['375px'].delta}px, 1440px=${routeData.overflow['1440px'].delta}px`);
  }

  // 3. Audit UF Sample Routes
  console.log('\n--- 3. Auditoria de Amostragem de UFs ---');
  for (const uf of SAMPLE_UFS) {
    const ufPath = `/evidencias/territorio/${uf}/`;
    const url = `${BASE_URL}${ufPath}`;
    console.log(`Auditando UF: ${uf.toUpperCase()} (${ufPath})`);

    const ufData = {
      uf,
      path: ufPath,
      h1: null,
      h1Count: 0,
      canonical: null,
      guardPresent: false,
      overflow: {},
      axe: {
        totalViolations: 0,
        structuralViolations: 0,
        contrastViolations: 0,
        contrastNodes: 0
      },
      screenshots: {}
    };

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    const h1s = await page.$$eval('h1', els => els.map(e => e.innerText.trim()));
    ufData.h1Count = h1s.length;
    ufData.h1 = h1s[0] || null;
    ufData.canonical = await page.$eval('link[rel="canonical"]', el => el.href).catch(() => null);

    const guards = await page.$$eval('.guard, .note, [data-guard]', els => els.map(e => e.innerText.trim()));
    ufData.guardPresent = guards.some(g => /procedimentos?\s+aprovados?.*não\s+(pessoas|pacientes)/i.test(g) || /procedimentos?,?\s+não\s+(pessoas|pacientes)/i.test(g));

    const axe = new AxeBuilder({ page });
    const axeRes = await axe.analyze();
    ufData.axe.totalViolations = axeRes.violations.length;
    for (const v of axeRes.violations) {
      if (v.id === 'color-contrast') {
        ufData.axe.contrastViolations++;
        ufData.axe.contrastNodes += v.nodes.length;
      } else {
        ufData.axe.structuralViolations++;
      }
    }

    // Screenshot for sample UF (SP, BA, RJ, RS, AM)
    const desktopShot = path.join(screenshotDir, `uf-${uf}-desktop-1440.png`);
    await page.screenshot({ path: desktopShot, fullPage: true });
    ufData.screenshots['1440px'] = path.relative(process.cwd(), desktopShot).replace(/\\/g, '/');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    const mobileShot = path.join(screenshotDir, `uf-${uf}-mobile-390.png`);
    await page.screenshot({ path: mobileShot, fullPage: true });
    ufData.screenshots['390px'] = path.relative(process.cwd(), mobileShot).replace(/\\/g, '/');

    await context.close();

    // Overflow check on 320px, 375px, 768px, 1024px, 1440px
    for (const vp of VIEWPORTS) {
      const vpContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const vpPage = await vpContext.newPage();
      await vpPage.goto(url, { waitUntil: 'load' });
      await vpPage.waitForTimeout(500);

      const overflow = await vpPage.evaluate(() => {
        const delta = document.documentElement.scrollWidth - window.innerWidth;
        return { delta, hasOverflow: delta > 0.5 };
      });
      ufData.overflow[vp.name] = overflow;
      await vpContext.close();
    }

    results.ufSampleRoutes.push(ufData);
    console.log(`  UF ${uf.toUpperCase()}: h1=${ufData.h1Count}, axe-struct=${ufData.axe.structuralViolations}, axe-contrast-nodes=${ufData.axe.contrastNodes}, overflow-320=${ufData.overflow['320px'].delta}px, overflow-1440=${ufData.overflow['1440px'].delta}px`);
  }

  await browser.close();
  server.close();

  // Save audit results to JSON
  const outJson = path.resolve('docs/evidencias/onda2/auditoria_onda2_resultados.json');
  // Agrega o sumario a partir do que foi realmente auditado. Antes ficava
  // zerado, e um relatorio que diz "0 rotas" depois de auditar 7 engana
  // quem le. Ver ANTI-PADRAO-QA-VAGO.
  const auditadas = [...results.canonicalRoutes, ...results.ufSampleRoutes];
  results.summary.totalRoutes = auditadas.length;
  results.summary.singleH1Count = auditadas.filter(r => r.h1Count === 1).length;
  results.summary.guardCount = auditadas.filter(r => r.guardPresent).length;
  // overflow e um objeto por viewport; a rota so passa se todos derem delta 0.
  results.summary.overflowZeroCount = auditadas.filter(r =>
    Object.values(r.overflow ?? {}).every(v => v?.hasOverflow === false)).length;
  results.summary.axeStructuralZeroCount = auditadas.filter(r =>
    (r.axe?.structuralViolations ?? 1) === 0).length;
  results.summary.ink3ContrastCount = auditadas.filter(r =>
    (r.axe?.contrastNodes ?? 0) > 0).length;

  fs.writeFileSync(outJson, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nAudit completed! Results saved to ${outJson}`);
}

run().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
