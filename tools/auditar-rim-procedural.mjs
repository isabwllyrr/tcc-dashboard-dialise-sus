/** QA de integração real, servido por HTTP. Sem chamadas a serviços externos. */
import {chromium} from 'playwright';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import os from 'node:os';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
const base=process.env.RIM_URL||'http://127.0.0.1:4328';
assert(base.startsWith('http://127.0.0.1:')||base.startsWith('http://localhost:'));
const output='docs/evidencias/rim-procedural/medicoes.json';
const report={date:new Date().toISOString(),base,machine:{cpu:os.cpus()[0].model,os:`${os.type()} ${os.release()} ${os.arch()}`}};
const readGLB=async path=>{const b=await readFile(path);return {b,json:JSON.parse(b.subarray(20,20+b.readUInt32LE(12)))};};
const {b,json}=await readGLB('public/assets/kidney.glb');
const source=(await readGLB('docs/amostra/assets/source/rim-procedural-master.glb')).json;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const doc=await io.read('public/assets/kidney.glb');
report.geometry={nodes:json.nodes.map(n=>n.name),sourceNodes:source.nodes.map(n=>n.name),materials:json.materials,images:json.images,triangles:0,closedMeshes:[]};
for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
  const pos=p.getAttribute('POSITION'),idx=p.getIndices().getArray(),edges=new Map();
  report.geometry.triangles+=idx.length/3;
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  const keys=[];
  for(let i=0;i<pos.getCount();i++){
    const v=pos.getElement(i,[]);keys.push(v.map(x=>Math.round(x*1e5)).join(','));
    v.forEach((x,k)=>{min[k]=Math.min(min[k],x);max[k]=Math.max(max[k],x);});
  }
  for(let i=0;i<idx.length;i+=3)for(const [a,c]of[[idx[i],idx[i+1]],[idx[i+1],idx[i+2]],[idx[i+2],idx[i]]]){
    const key=[keys[a],keys[c]].sort().join('|');edges.set(key,(edges.get(key)||0)+1);
  }
  const boundary=[...edges.values()].filter(n=>n===1).length;
  const nonManifold=[...edges.values()].filter(n=>n>2).length;
  const scale=doc.getRoot().listNodes().find(n=>n.getMesh()===mesh).getScale();
  report.geometry.closedMeshes.push({name:mesh.getName(),boundaryEdges:boundary,nonManifoldEdges:nonManifold,dimensions:max.map((x,k)=>(x-min[k])*scale[k])});
  assert.equal(boundary,0,'malha com borda aberta');
  assert.equal(nonManifold,0,'arestas não manifold após quantização');
}
assert(report.geometry.triangles>=60000&&report.geometry.triangles<=120000);
assert(json.images.length>0);
assert.deepEqual(report.geometry.nodes,report.geometry.sourceNodes);
if(process.argv.includes('--geometry-only')){console.log(JSON.stringify(report.geometry.closedMeshes));process.exit(0);}
const runtimes=['kidney.js','vendor/three.module.min.js','vendor/three.core.min.js','vendor/GLTFLoader.js','vendor/meshopt_decoder.module.js','utils/BufferGeometryUtils.js'];
const measure=async path=>{const d=await readFile(path);return {path,bytes:d.length,gzip:gzipSync(d,{level:9}).length,sha256:createHash('sha256').update(d).digest('hex')};};
const binStart=20+b.readUInt32LE(12)+8;
let textureBytes=0;
const textureParts=json.images.map(im=>{const v=json.bufferViews[im.bufferView];textureBytes+=v.byteLength;return b.subarray(binStart+(v.byteOffset||0),binStart+(v.byteOffset||0)+v.byteLength);});
const geometryParts=[];
// Disjoint partition of all GLB bytes: image buffer ranges versus everything else.
const spans=json.images.map(im=>json.bufferViews[im.bufferView]).map(v=>[binStart+(v.byteOffset||0),binStart+(v.byteOffset||0)+v.byteLength]).sort((a,c)=>a[0]-c[0]);
let cursor=0;for(const [start,end]of spans){geometryParts.push(b.subarray(cursor,start));cursor=end;}geometryParts.push(b.subarray(cursor));
report.weight={runtime:await Promise.all(runtimes.map(p=>measure('public/assets/'+p))),glb:await measure('public/assets/kidney.glb'),fallbacks:await Promise.all(['position','hilum'].map(v=>measure(`public/assets/kidney-${v}.webp`))),
  breakdown:{textureBytes,textureGzipSeparate:gzipSync(Buffer.concat(textureParts),{level:9}).length,geometryAndContainerGzipSeparate:gzipSync(Buffer.concat(geometryParts),{level:9}).length},
  note:'gzip nível 9 por recurso. Partições comprimidas separadamente não são aditivas ao gzip do GLB inteiro.'};
report.weight.totalGzip=report.weight.runtime.reduce((n,r)=>n+r.gzip,0)+report.weight.glb.gzip+report.weight.fallbacks.reduce((n,r)=>n+r.gzip,0);
assert(report.weight.totalGzip<=750000);
const browser=await chromium.launch({headless:true,channel:'msedge'});
report.machine.browser=browser.version();
const context=await browser.newContext({viewport:{width:1440,height:1080},deviceScaleFactor:2,colorScheme:'light'});
const page=await context.newPage();
const requests=[],errors=[];
page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
const threeRequest=url=>/three\.(core|module)|GLTFLoader|meshopt_decoder|BufferGeometryUtils|kidney\.glb/.test(url);
await page.goto(base,{waitUntil:'networkidle'});
report.beforeClick=requests.filter(threeRequest);assert.equal(report.beforeClick.length,0);
await page.locator('#enable-3d').click();await page.waitForFunction(()=>window.__kidneyMetrics?.paintedPixels>0);
await page.locator('#kidney-stage').scrollIntoViewIfNeeded();
await page.waitForTimeout(700);
report.render=await page.locator('canvas').evaluate(c=>{
  const gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {metrics:window.__kidneyMetrics,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),width:c.width,height:c.height};
});
report.pixels={};
for(const view of ['position','hilum']){
  await page.locator(`[data-view="${view}"]`).click();await page.waitForTimeout(800);
  report.pixels[view]=await page.locator('canvas').evaluate(c=>{
    const gl=c.getContext('webgl2'),p=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,p);
    let count=0,green=0;const luminance=[],hues=[],hist={};
    for(let i=0;i<p.length;i+=4){if(p[i+3]<240)continue;const [r,g,b]=[p[i],p[i+1],p[i+2]];count++;
      const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let hue=0;
      if(d){hue=(max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4)*60;if(hue<0)hue+=360;}
      const sat=max?d/max:0;if(sat>.2){hues.push(hue);if(hue>=145&&hue<=195)green++;}
      luminance.push(.2126*r+.7152*g+.0722*b);
      const key=[r,g,b].map(x=>Math.floor(x/16)*16).join(',');hist[key]=(hist[key]||0)+1;
    }
    luminance.sort((a,b)=>a-b);hues.sort((a,b)=>a-b);
    const pct=(a,q)=>a[Math.floor((a.length-1)*q)];
    return {opaquePixels:count,greenPixels:green,greenDefinition:'HSV H=145..195°, S>.2, alpha>=240',luminanceP05:pct(luminance,.05),luminanceP95:pct(luminance,.95),hueP05:pct(hues,.05),hueP95:pct(hues,.95),dominantBins:Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,10)};
  });
  assert(report.pixels[view].opaquePixels>0);assert.equal(report.pixels[view].greenPixels,0);
  assert(report.pixels[view].luminanceP95-report.pixels[view].luminanceP05>20);
  await page.locator('#kidney-stage').screenshot({path:`docs/evidencias/rim-procedural/${view}.png`});
}
// Continuous real rAF timing after loading, with the pointer held and moved.
const canvas=page.locator('canvas'),box=await canvas.boundingBox();
await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
await page.evaluate(async()=>{
  const c=document.querySelector('canvas'),b=c.getBoundingClientRect();
  await new Promise(resolve=>{let frame=0;function step(){
    c.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:b.x+b.width/2+Math.sin(frame*.055)*25,clientY:b.y+b.height/2+Math.cos(frame*.055)*5,bubbles:true}));
    if(++frame<310)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});
});
await page.mouse.up();
report.interaction=await page.evaluate(()=>window.__kidneyMetrics);
assert(report.interaction.windows.length>=3);
await page.waitForTimeout(1200);const idle=await page.evaluate(()=>window.__kidneyMetrics.renderCount);
await page.waitForTimeout(350);report.idleRenders=(await page.evaluate(()=>window.__kidneyMetrics.renderCount))-idle;assert.equal(report.idleRenders,0);
await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(250);
const offscreen=await page.evaluate(()=>window.__kidneyMetrics.renderCount);await page.waitForTimeout(350);
report.offscreenRenders=(await page.evaluate(()=>window.__kidneyMetrics.renderCount))-offscreen;assert.equal(report.offscreenRenders,0);
// Named views remain reachable without transitions.
await page.emulateMedia({reducedMotion:'reduce'}); // module queries preference at load
await page.reload({waitUntil:'networkidle'});await page.locator('#enable-3d').click();await page.waitForFunction(()=>window.__kidneyMetrics?.paintedPixels>0);
await page.locator('canvas').focus();await page.keyboard.press('2');
assert.equal(await page.locator('[data-view="hilum"]').getAttribute('aria-pressed'),'true');
await page.keyboard.press('1');assert.equal(await page.locator('[data-view="position"]').getAttribute('aria-pressed'),'true');
report.reducedMotionKeyboard=true;
// Canvas context failure restores the actual generated HTML fallbacks.
await page.locator('canvas').evaluate(c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
assert(await page.locator('#kidney-fallback').isVisible());await page.locator('[data-view="hilum"]').click();
assert(await page.locator('#kidney-fallback figure').nth(1).isVisible());report.contextLossFallback=true;
await context.close();
const nojs=await browser.newContext({javaScriptEnabled:false});const staticPage=await nojs.newPage();await staticPage.goto(base);
report.noJS=await staticPage.locator('#kidney-fallback img').evaluateAll(imgs=>imgs.map(i=>({loaded:i.complete&&i.naturalWidth>0,src:i.getAttribute('src')})));
assert(report.noJS.every(i=>i.loaded));await nojs.close();
const failed=await browser.newPage();await failed.route('**/assets/kidney.glb',r=>r.abort());await failed.goto(base);await failed.locator('#enable-3d').click();await failed.waitForFunction(()=>window.__kidneyMetrics?.mode==='static-fallback');report.downloadFailureFallback=await failed.locator('#kidney-fallback').isVisible();assert(report.downloadFailureFallback);await failed.close();
const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});await mobile.goto(base);await mobile.locator('#enable-3d').tap();await mobile.waitForFunction(()=>window.__kidneyMetrics?.paintedPixels>0);await mobile.locator('[data-view="hilum"]').tap();assert.equal(await mobile.locator('[data-view="hilum"]').getAttribute('aria-pressed'),'true');report.touch=true;await mobile.locator('#kidney-stage').screenshot({path:'docs/evidencias/rim-procedural/mobile-hilum.png'});await mobile.close();
const files=await readdir('dist',{recursive:true});const routes=files.filter(p=>p.replaceAll('\\','/').endsWith('/index.html')).map(p=>'/'+p.replaceAll('\\','/').replace(/index\.html$/,''));
report.otherRoutes=[];
for(const route of routes){
  const p=await browser.newPage(),r=[];p.on('request',q=>{if(threeRequest(q.url())||q.url().endsWith('/kidney.js'))r.push(q.url());});
  const response=await p.goto(base+route,{waitUntil:'networkidle'});report.otherRoutes.push({route,status:response.status(),requests3D:r});assert.equal(r.length,0);assert.equal(response.status(),200);await p.close();
}
assert.equal(report.otherRoutes.length,33);report.errors=errors;assert.equal(errors.length,0);
await browser.close();await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,weight:report.weight.totalGzip,windows:report.interaction.windows,gpu:report.render.gpu,routes:report.otherRoutes.length},null,2));
