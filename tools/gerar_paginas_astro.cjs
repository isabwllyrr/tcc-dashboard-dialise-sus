const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const AMOSTRA = path.join(ROOT, "docs", "amostra", "site");

function stripScripts(htmlText) {
  let html = htmlText.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<div class="legend-ramp"/g, '<div class="legend-ramp" role="img"');
  html = html.replace(/<svg class="map"([^>]*)role="img"/g, "<svg class=\"map\"$1role=\"group\"");
  return html;
}

function getMain(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (!match) throw new Error(`Could not find <main> in ${filePath}`);
  return stripScripts(match[1]);
}

// 1. BaseLayout
const baseLayout = `---
interface Props {
  title: string;
  description?: string;
}

const { title, description = "Caderno aberto de evidências sobre procedimentos de diálise aprovados no SUS." } = Astro.props;
const currentPath = Astro.url.pathname;
const isHome = currentPath === "/" || currentPath === "";
const isValor = currentPath.startsWith("/evidencias/valor");
const isTerritorio = currentPath.startsWith("/evidencias/territorio");
const isContagem = currentPath.startsWith("/evidencias/contagem");
const isModelo = currentPath.startsWith("/evidencias/modelo");
const isBase = currentPath.startsWith("/sobre-a-base");
const pageTitle = title.includes("DialisaSUS") ? title : \`\${title} · DialisaSUS\`;
const canonicalUrl = new URL(Astro.url.pathname, "https://dialisasus.netlify.app").href;
---

<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>{pageTitle}</title>
    <meta name="description" content={description} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="canonical" href={canonicalUrl} />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Newsreader:ital,opsz,wght@1,6..72,400;1,6..72,500&family=IBM+Plex+Mono:wght@400;500&display=swap" />
    <link rel="stylesheet" href="/assets/style.css" />
  </head>
  <body>
    <div class="shell">
      <header class="head">
        <div class="head-row">
          <span class="mark">Dialisa<i>SUS</i></span>
          <span class="stamp">produto acadêmico de TCC · SIA/SUS via TabNet</span>
        </div>
        <nav aria-label="Rotas">
          <a href="/" aria-current={isHome ? "page" : undefined}>Início</a>
          <a href="/evidencias/valor/" aria-current={isValor ? "page" : undefined}>Valor</a>
          <a href="/evidencias/territorio/" aria-current={isTerritorio ? "page" : undefined}>Território</a>
          <a href="/evidencias/contagem/" aria-current={isContagem ? "page" : undefined}>Contagem</a>
          <a href="/evidencias/modelo/" aria-current={isModelo ? "page" : undefined}>Modelo</a>
          <a href="/sobre-a-base/" aria-current={isBase ? "page" : undefined}>Sobre a base</a>
        </nav>
      </header>
      <main>
        <slot />
      </main>
      <footer class="colophon">
        <p><b>DialisaSUS é um produto acadêmico de TCC.</b> Ministério da Saúde, DATASUS e IBGE são fontes; não chancelam esta publicação.</p>
        <p>Dados por local de atendimento. Extração registrada em setembro de 2026.</p>
      </footer>
    </div>
  </body>
</html>
`;
fs.writeFileSync(path.join(SRC, "layouts", "BaseLayout.astro"), baseLayout, "utf8");
console.log("✓ src/layouts/BaseLayout.astro");

// 2. Home
const homeMain = getMain(path.join(AMOSTRA, "index.html"));
const homeAstro = `---
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout title="Início">
${homeMain}
</BaseLayout>
`;
fs.writeFileSync(path.join(SRC, "pages", "index.astro"), homeAstro, "utf8");
console.log("✓ src/pages/index.astro");

// 3. Valor
const valorMain = getMain(path.join(AMOSTRA, "evidencias", "valor", "index.html"));
const valorAstro = `---
import BaseLayout from "../../../layouts/BaseLayout.astro";
---

<BaseLayout title="Valor">
${valorMain}
</BaseLayout>
`;
fs.writeFileSync(path.join(SRC, "pages", "evidencias", "valor", "index.astro"), valorAstro, "utf8");
console.log("✓ src/pages/evidencias/valor/index.astro");

// 4. Contagem
const contagemMain = getMain(path.join(AMOSTRA, "evidencias", "contagem", "index.html"));
const contagemAstro = `---
import BaseLayout from "../../../layouts/BaseLayout.astro";
---

<BaseLayout title="Contagem">
${contagemMain}
</BaseLayout>
`;
fs.writeFileSync(path.join(SRC, "pages", "evidencias", "contagem", "index.astro"), contagemAstro, "utf8");
console.log("✓ src/pages/evidencias/contagem/index.astro");

// 5. Território
const territorioMain = getMain(path.join(AMOSTRA, "evidencias", "territorio", "index.html"));
const territorioAstro = `---
import BaseLayout from "../../../layouts/BaseLayout.astro";
---

<BaseLayout title="Território">
${territorioMain}
</BaseLayout>
`;
fs.writeFileSync(path.join(SRC, "pages", "evidencias", "territorio", "index.astro"), territorioAstro, "utf8");
console.log("✓ src/pages/evidencias/territorio/index.astro");

// 6. Território [uf].astro (27 UFs)
const ufs = ["ac", "al", "am", "ap", "ba", "ce", "df", "es", "go", "ma", "mg", "ms", "mt", "pa", "pb", "pe", "pi", "pr", "rj", "rn", "ro", "rr", "rs", "sc", "se", "sp", "to"];
const ufDict = {};
for (const uf of ufs) {
  ufDict[uf] = getMain(path.join(AMOSTRA, "evidencias", "territorio", uf, "index.html"));
}

const ufJson = JSON.stringify(ufDict);
const ufAstro = `---
import BaseLayout from "../../../layouts/BaseLayout.astro";

export async function getStaticPaths() {
  const ufs = ${JSON.stringify(ufs)};
  return ufs.map((uf) => ({ params: { uf } }));
}

const { uf } = Astro.params;
const ufData: Record<string, string> = ${ufJson};
const content = (uf && ufData[uf]) || ufData["sp"];
const ufUpper = (uf || "").toUpperCase();
---

<BaseLayout title={\`Território · \${ufUpper}\`}>
  <Fragment set:html={content} />
</BaseLayout>
`;
fs.writeFileSync(path.join(SRC, "pages", "evidencias", "territorio", "[uf].astro"), ufAstro, "utf8");
console.log("✓ src/pages/evidencias/territorio/[uf].astro (27 UFs)");

// 7. Modelo
const modeloMain = getMain(path.join(AMOSTRA, "evidencias", "modelo", "index.html"));
const modeloAstro = `---
import BaseLayout from "../../../layouts/BaseLayout.astro";
---

<BaseLayout title="Modelo">
${modeloMain}
</BaseLayout>
`;
fs.writeFileSync(path.join(SRC, "pages", "evidencias", "modelo", "index.astro"), modeloAstro, "utf8");
console.log("✓ src/pages/evidencias/modelo/index.astro");

// 8. Sobre a base
const sobreMain = getMain(path.join(AMOSTRA, "sobre-a-base", "index.html"));
const sobreAstro = `---
import BaseLayout from "../../layouts/BaseLayout.astro";
---

<BaseLayout title="Sobre a base">
${sobreMain}
</BaseLayout>
`;
fs.writeFileSync(path.join(SRC, "pages", "sobre-a-base", "index.astro"), sobreAstro, "utf8");
console.log("✓ src/pages/sobre-a-base/index.astro");

// 9. Assistente
const assistenteAstro = `---
import BaseLayout from "../../layouts/BaseLayout.astro";
---

<BaseLayout title="Assistente">
  <p class="eyebrow">Assistente</p>
  <h1 class="claim">Em qual evidência encontro <em>resposta sustentada</em>?</h1>
  <p class="standfirst">O assistente interpreta os indicadores já disponíveis no dossiê e localiza a evidência correspondente em cada rota. Não cria dados, não faz diagnóstico e não substitui análise técnica.</p>
  <p class="guard">Esta base conta procedimentos aprovados, não pessoas. Uma pessoa pode realizar vários procedimentos.</p>

  <div class="scope">
    <section>
      <h2>O que esta funcionalidade demonstra</h2>
      <ul>
        <li>Capacidade de localizar e citar a rota dona de cada número.</li>
      </ul>
    </section>
    <section class="limits">
      <h2>O que não faz</h2>
      <ul>
        <li>Não busca na internet.</li>
        <li>Não dá conselho médico.</li>
        <li>Não inventa número fora do dossiê.</li>
      </ul>
    </section>
  </div>

  <section class="stage" style="margin-top: var(--gap);">
    <form method="POST" action="/api/agent" class="agent-form">
      <label for="pergunta" class="label" style="display: block; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink3); margin-bottom: 8px;">Faça uma pergunta sobre as evidências do DialisaSUS:</label>
      <div class="selector" style="margin: 8px 0 14px 0;">
        <textarea id="pergunta" name="pergunta" rows="3" placeholder="Ex: Qual foi a variação real do valor aprovado entre 2015 e 2025?" required style="width: 100%; box-sizing: border-box; font: inherit; background: var(--bg); color: var(--ink); border: 1px solid var(--rule-2); padding: 12px;"></textarea>
      </div>
      <div class="kidney-controls" style="margin-top: 0;">
        <button type="submit" style="font: 500 0.85rem var(--sans); padding: 10px 20px; border: 1px solid var(--accent); background: var(--accent); color: var(--light-main); cursor: pointer; min-height: 44px;">Consultar assistente</button>
        <span class="kidney-hint">Fallback estático sem JavaScript · Processado via Netlify Function (/api/agent)</span>
      </div>
    </form>
  </section>

  <p class="sect">Contexto e tecnologia</p>
  <p class="calc">Rota: <code>/assistente/</code> · Tecnologia: Netlify Function (<code>/api/agent</code>), provedor Gemini. O contexto é montado no servidor a partir do dossiê. Toda resposta cita a rota dona correspondente.</p>

  <p class="sect">Como foi calculada</p>
  <p class="calc">O contexto do assistente é montado a partir dos indicadores consolidados do dossiê e do glossário formal de termos. Respostas sobre projeções citam o erro do backtest.</p>

  <p class="sect">O que enfraquece esta funcionalidade</p>
  <div class="weaks">
    <details>
      <summary>Incerteza de previsão e unidade de análise</summary>
      <p>Respostas sobre estimativas futuras trazem o MAPE do backtest como ressalva obrigatória. O assistente é instruído a reiterar que procedimentos aprovados não correspondem a contagem de indivíduos.</p>
    </details>
    <details>
      <summary>Segurança contra injeção e recusa clínica</summary>
      <p>O conteúdo do dossiê é tratado estritamente como dado, nunca como instrução. Perguntas com teor clínico ou diagnóstico são barradas por regra determinística local antes de qualquer chamada a provedores externos.</p>
    </details>
  </div>

  <div class="next">
    <a href="/">
      <span class="q">Voltar ao começo</span>
      <span class="path">/</span>
    </a>
  </div>
</BaseLayout>
`;
fs.writeFileSync(path.join(SRC, "pages", "assistente", "index.astro"), assistenteAstro, "utf8");
console.log("✓ src/pages/assistente/index.astro");

console.log("\nTodos os arquivos foram gerados com sucesso!");
