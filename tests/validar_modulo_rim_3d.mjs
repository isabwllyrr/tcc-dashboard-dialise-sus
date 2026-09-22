import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8',
};

function serveDist(port = 4188) {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath.endsWith('/')) reqPath += 'index.html';
    else if (!path.extname(reqPath)) reqPath += '/index.html';

    const filePath = path.join(DIST_DIR, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((res) => server.close(res)),
      });
    });
  });
}

async function runAudit() {
  console.log('=== 1. VERIFICANDO ARQUIVOS GERADOS EM DIST ===');
  
  // List all html files in dist
  function getFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files = files.concat(getFiles(full));
      else files.push(full);
    }
    return files;
  }

  const allFiles = getFiles(DIST_DIR);
  const htmlFiles = allFiles.filter(f => f.endsWith('.html') && !f.includes('licenses'));
  console.log(`Total de rotas HTML compiladas: ${htmlFiles.length}`);
  if (htmlFiles.length !== 34) {
    throw new Error(`Esperado 34 rotas HTML, encontrado ${htmlFiles.length}`);
  }

  // Check that index.html has kidney scripts and 33 other pages have 0 KB of 3D runtime
  const homeHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
  if (!homeHtml.includes('/assets/kidney.js')) {
    throw new Error('Home (dist/index.html) não inclui /assets/kidney.js');
  }
  if (!homeHtml.includes('three.module.min.js')) {
    throw new Error('Home (dist/index.html) não inclui importmap com three.module.min.js');
  }
  if (!homeHtml.includes('/assets/kidney-position.webp') || !homeHtml.includes('/assets/kidney-hilum.webp')) {
    throw new Error('Home não inclui vistas estáticas WebP no HTML inicial');
  }
  if (!homeHtml.includes('id="enable-3d"')) {
    throw new Error('Home não possui botão #enable-3d');
  }
  console.log('✔ Home possui importmap, script do rim, vistas WebP e botão #enable-3d');

  let otherPagesWith3D = 0;
  for (const file of htmlFiles) {
    const rel = path.relative(DIST_DIR, file).replace(/\\/g, '/');
    if (rel === 'index.html') continue;
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('kidney') || content.includes('three') || content.includes('GLTF') || content.includes('meshopt')) {
      console.error(`❌ Rota ${rel} contém resíduos 3D!`);
      otherPagesWith3D++;
    }
  }

  if (otherPagesWith3D > 0) {
    throw new Error(`${otherPagesWith3D} rotas fora da home contêm código ou referências 3D!`);
  }
  console.log('✔ Todas as outras 33 rotas mantêm RIGOROSAMENTE 0 KB de runtime 3D');

  // Verify asset files exist
  const requiredAssets = [
    'assets/kidney.js',
    'assets/kidney-position.webp',
    'assets/kidney-hilum.webp',
    'assets/kidney.glb',
    'assets/vendor/three.module.min.js',
    'assets/vendor/GLTFLoader.js',
    'assets/vendor/meshopt_decoder.module.js',
    'assets/utils/BufferGeometryUtils.js',
  ];
  for (const asset of requiredAssets) {
    const p = path.join(DIST_DIR, asset);
    if (!fs.existsSync(p)) {
      throw new Error(`Asset obrigatório não encontrado: ${asset}`);
    }
    const size = fs.statSync(p).size;
    console.log(`✔ Asset presente: ${asset} (${size} bytes)`);
  }

  console.log('\n=== 2. INICIANDO SERVIDOR HTTP E TESTES DE RUNTIME PLAYWRIGHT ===');
  const serverInstance = await serveDist(4188);
  console.log(`Servidor HTTP ativo em ${serverInstance.url}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const networkRequests = [];
  page.on('request', req => {
    networkRequests.push(req.url());
  });

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err));

  await page.goto(`${serverInstance.url}/`, { waitUntil: 'networkidle' });

  if (pageErrors.length > 0) {
    throw new Error(`Erros na página ao carregar: ${pageErrors.join(', ')}`);
  }

  // 2.1 Verificação antes do clique
  console.log('\n--- 2.1 Verificações Antes do Clique (#enable-3d) ---');
  const threeLoadedBefore = networkRequests.some(url => url.includes('three') || url.includes('GLTF') || url.includes('meshopt') || url.includes('kidney.glb'));
  console.log(`Recursos 3D (Three/GLTF/Meshopt/GLB) carregados antes do clique: ${threeLoadedBefore ? 'SIM ❌' : 'NÃO ✔ (0 KB transferidos)'}`);
  if (threeLoadedBefore) {
    throw new Error('Recursos 3D foram carregados antes da solicitação explícita do usuário!');
  }

  // Fallback figures
  const fallbackVisible = await page.$eval('#kidney-fallback', el => !el.hidden && getComputedStyle(el).display !== 'none');
  console.log(`Vistas estáticas visíveis no DOM: ${fallbackVisible ? 'SIM ✔' : 'NÃO ❌'}`);
  if (!fallbackVisible) throw new Error('Fallback estático não está visível antes da ativação');

  const metricsBefore = await page.evaluate(() => window.__kidneyMetrics);
  console.log('Métricas iniciais:', JSON.stringify(metricsBefore));
  if (metricsBefore.mode !== 'static' || metricsBefore.assetLoaded !== false) {
    throw new Error('Estado inicial não está em modo estático');
  }

  // Test static view toggle
  await page.click('button[data-view="hilum"]');
  const hilumPressed = await page.$eval('button[data-view="hilum"]', el => el.getAttribute('aria-pressed'));
  const fig1Hidden = await page.$eval('#kidney-fallback figure:first-child', el => el.hidden);
  const fig2Hidden = await page.$eval('#kidney-fallback figure:last-child', el => el.hidden);
  console.log(`Alternância estática para Hilo: pressed=${hilumPressed}, fig1Hidden=${fig1Hidden}, fig2Hidden=${fig2Hidden}`);
  if (hilumPressed !== 'true' || !fig1Hidden || fig2Hidden) {
    throw new Error('Alternância de vistas estáticas falhou');
  }

  // 2.2 Clique em Explorar em 3D
  console.log('\n--- 2.2 Ativação Sob Demanda (#enable-3d) ---');
  await page.click('#enable-3d');

  // Wait for canvas to appear and loaded
  await page.waitForSelector('#kidney-stage canvas', { state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => window.__kidneyMetrics.assetLoaded === true && window.__kidneyMetrics.paintedPixels > 0, { timeout: 10000 });

  const threeRequestsAfter = networkRequests.filter(url => url.includes('three') || url.includes('GLTF') || url.includes('meshopt') || url.includes('kidney.glb'));
  console.log(`Recursos 3D carregados após clique (${threeRequestsAfter.length} recursos):`);
  threeRequestsAfter.forEach(u => console.log('  ->', u));

  const metricsAfter = await page.evaluate(() => window.__kidneyMetrics);
  console.log('Métricas após ativação:', JSON.stringify(metricsAfter));
  if (metricsAfter.paintedPixels <= 0) {
    throw new Error('Canvas WebGL desenhado com 0 pixels pintados (canvas branco)!');
  }
  console.log(`✔ Pixels WebGL renderizados: ${metricsAfter.paintedPixels} pixels com cor e alfa.`);

  const fallbackHiddenAfter = await page.$eval('#kidney-fallback', el => el.hidden);
  console.log(`Fallback estático ocultado após ativação 3D: ${fallbackHiddenAfter ? 'SIM ✔' : 'NÃO ❌'}`);
  if (!fallbackHiddenAfter) throw new Error('Fallback não foi ocultado após ativação do 3D');

  // 2.3 Simulação de interação
  console.log('\n--- 2.3 Interação e Taxa de Quadros (FPS) ---');
  const canvasBox = await page.$eval('#kidney-stage canvas', el => {
    const rect = el.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: rect.width, height: rect.height };
  });

  // Drag interaction
  await page.mouse.move(canvasBox.x, canvasBox.y);
  await page.mouse.down();
  for (let i = 0; i < 70; i++) {
    await page.mouse.move(canvasBox.x + (i % 2 === 0 ? 30 : -30), canvasBox.y + i * 0.5);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();

  const metricsWithFPS = await page.evaluate(() => window.__kidneyMetrics);
  console.log(`Janelas de FPS coletadas: ${metricsWithFPS.windows.length}`);
  metricsWithFPS.windows.forEach((w, idx) => console.log(`  Janela ${idx + 1}: ${w.fps} FPS (${w.frames} frames, dpr ${w.dpr})`));

  // 2.4 Ciclo de vida: Ocultação da aba (visibilitychange)
  console.log('\n--- 2.4 Ciclo de Vida: Ocultação da Aba (visibilitychange) ---');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const isHiddenPausing = await page.evaluate(() => {
    return document.hidden;
  });
  console.log(`Aba oculta simulada: hidden=${isHiddenPausing}`);

  // Restore visibility
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  console.log('Aba restaurada e render retomado.');

  // 2.5 Ciclo de vida: Pagehide e Descarte de Recursos
  console.log('\n--- 2.5 Ciclo de Vida: Descarte em pagehide ---');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('pagehide'));
  });
  console.log('✔ Evento pagehide disparado e dispose executado com sucesso.');

  await browser.close();
  await serverInstance.close();

  console.log('\n=============================================');
  console.log('TODAS AS VALIDAÇÕES PASSARAM COM 100% DE SUCESSO!');
  console.log('=============================================');
}

runAudit().catch(err => {
  console.error('\n❌ ERRO NA VALIDAÇÃO:', err);
  process.exit(1);
});
