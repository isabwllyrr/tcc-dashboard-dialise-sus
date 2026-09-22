import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const dist = path.join(root, "dist");
const evidence = path.join(root, "docs", "evidencias", "final");
fs.mkdirSync(evidence, { recursive: true });
const port = 4322;
const mime = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".glb":"model/gltf-binary",".woff2":"font/woff2"};

const server = http.createServer((request,response)=>{
  const clean=decodeURIComponent(new URL(request.url,"http://local").pathname);let target=path.join(dist,clean);
  if(clean.endsWith("/"))target=path.join(target,"index.html");else if(!path.extname(target)&&fs.existsSync(`${target}.html`))target=`${target}.html`;
  if(!target.startsWith(dist)||!fs.existsSync(target)){response.writeHead(404);response.end("not found");return;}
  response.writeHead(200,{"content-type":mime[path.extname(target)]||"application/octet-stream"});fs.createReadStream(target).pipe(response);
});

function routesFromDist(directory=dist,prefix=""){
  const routes=[];
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    if(entry.name.startsWith("_"))continue;
    const relative=path.posix.join(prefix,entry.name);
    if(entry.isDirectory())routes.push(...routesFromDist(path.join(directory,entry.name),relative));
    else if(entry.name==="index.html")routes.push(`/${prefix}${prefix?"/":""}`.replaceAll("//","/"));
  }
  return routes.sort();
}

const screenshots={"/":"inicio","/evidencias/valor/":"valor","/evidencias/contagem/":"contagem","/evidencias/territorio/":"territorio","/evidencias/modelo/":"modelo","/sobre-a-base/":"base","/assistente/":"assistente"};
const report={generated_at:new Date().toISOString(),routes:[],interactions:{},summary:{}};

await new Promise((resolve)=>server.listen(port,"127.0.0.1",resolve));
const browser=await chromium.launch({headless:true});
try{
  const routes=routesFromDist();
  for(const route of routes){
    const entry={route,viewports:[]};
    for(const width of [390,1440]){
      const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});const errors=[];
      page.on("console",(message)=>{if(message.type()==="error")errors.push(message.text())});page.on("pageerror",(error)=>errors.push(error.message));
      const response=await page.goto(`http://127.0.0.1:${port}${route}`,{waitUntil:"load"});
      const measured=await page.evaluate(()=>({innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,h1:document.querySelectorAll("h1").length,lang:document.documentElement.lang}));
      const result={width,status:response?.status(),...measured,console_errors:errors};entry.viewports.push(result);
      if(result.status!==200||result.scrollWidth!==result.innerWidth||result.h1!==1||result.lang!=="pt-BR"||errors.length)throw new Error(`Falha ${route} @ ${width}: ${JSON.stringify(result)}`);
      if(screenshots[route])await page.screenshot({path:path.join(evidence,`${screenshots[route]}-${width}.png`),fullPage:true});
      await page.close();
    }
    report.routes.push(entry);
  }

  const territory=await browser.newPage({viewport:{width:390,height:900}});await territory.goto(`http://127.0.0.1:${port}/evidencias/territorio/`);const before=await territory.locator('[data-table-uf="SP"] [data-field="taxa"]').textContent();await territory.selectOption("#territory-year","2018");const after=await territory.locator('[data-table-uf="SP"] [data-field="taxa"]').textContent();report.interactions.territory_year={before,after,url:territory.url(),passed:before!==after&&territory.url().includes("ano=2018")};if(!report.interactions.territory_year.passed)throw new Error("Seletor territorial não atualizou estado/URL");await territory.close();

  const uf=await browser.newPage({viewport:{width:390,height:900}});await uf.goto(`http://127.0.0.1:${port}/evidencias/territorio/sp/`);await uf.selectOption("#uf-year","2017");report.interactions.uf_year={label:await uf.locator("#municipal-year-label").textContent(),url:uf.url()};if(report.interactions.uf_year.label!=="2017"||!uf.url().includes("ano=2017"))throw new Error("Seletor municipal não atualizou estado/URL");await uf.close();

  const home=await browser.newPage({viewport:{width:390,height:900}});const requested=[];home.on("request",(request)=>requested.push(new URL(request.url()).pathname));await home.goto(`http://127.0.0.1:${port}/`);const beforeClick=requested.includes("/assets/kidney.glb");await home.click("#enable-3d");await home.waitForFunction(()=>window.__kidneyMetrics?.assetLoaded===true,{timeout:20000});report.interactions.kidney={loaded_before_click:beforeClick,loaded_after_click:requested.includes("/assets/kidney.glb"),mode:await home.evaluate(()=>window.__kidneyMetrics.mode)};if(beforeClick||!report.interactions.kidney.loaded_after_click)throw new Error("Cena 3D não respeitou carregamento sob demanda");await home.close();

  const assistant=await browser.newPage({viewport:{width:390,height:900}});await assistant.route("**/api/agent",(route)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({answer:"Resposta de teste baseada no dossiê.",route:"/evidencias/valor/"})}));await assistant.goto(`http://127.0.0.1:${port}/assistente/`);await assistant.fill("#pergunta","Qual foi a variação real?");await assistant.click("#agent-form button");await assistant.locator("#agent-answer a").waitFor();report.interactions.assistant={answer:await assistant.locator("#agent-answer").innerText(),href:await assistant.locator("#agent-answer a").getAttribute("href")};if(report.interactions.assistant.href!=="/evidencias/valor/")throw new Error("Assistente não exibiu rota dona");await assistant.close();

  report.summary={pages:report.routes.length,viewport_checks:report.routes.length*2,overflows:0,h1_errors:0,console_errors:0,interactions:Object.keys(report.interactions).length};
  fs.writeFileSync(path.join(evidence,"auditoria-final.json"),JSON.stringify(report,null,2)+"\n");
  console.log(`QA final OK: ${report.summary.pages} páginas, ${report.summary.viewport_checks} viewports, ${report.summary.interactions} interações.`);
} finally {await browser.close();await new Promise((resolve)=>server.close(resolve));}
