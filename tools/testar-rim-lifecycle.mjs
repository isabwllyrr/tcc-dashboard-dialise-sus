import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.RIM_URL||'http://127.0.0.1:4328';
const browser=await chromium.launch({headless:true,channel:'msedge'});
const report={note:'Testes funcionais com relógio rAF injetado; estes valores NÃO são benchmarks de FPS.'};
const page=await browser.newPage({viewport:{width:1440,height:1080},reducedMotion:'reduce'});
await page.addInitScript(()=>{
  const native=requestAnimationFrame.bind(window);let clock=1000;
  window.__qaDelta=16.6667;window.__qaQueue=[];
  window.requestAnimationFrame=callback=>native(()=>callback(clock+=window.__qaQueue.shift()??window.__qaDelta));
});
await page.goto(base);await page.locator('#enable-3d').click();await page.waitForFunction(()=>window.__kidneyMetrics?.paintedPixels>0);
await page.locator('canvas').scrollIntoViewIfNeeded();
const box=await page.locator('canvas').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
await page.evaluate(()=>{window.__qaQueue=[16.6667,3000];});await page.mouse.down();
await page.waitForFunction(()=>window.__kidneyMetrics.windows.length===1);
report.singleSpike=await page.evaluate(()=>structuredClone(window.__kidneyMetrics));assert.equal(report.singleSpike.mode,'interactive');
await page.mouse.up();
await page.waitForTimeout(100);
// Three entire windows below 35, then three more below 30 at the reduced DPR.
await page.evaluate(()=>{window.__qaDelta=40;});await page.mouse.down();
await page.waitForFunction(()=>window.__kidneyMetrics.mode==='reduced-pixels-fixed-view');
report.reduced=await page.evaluate(()=>structuredClone(window.__kidneyMetrics));
await page.waitForFunction(()=>window.__kidneyMetrics.mode==='static-fallback');
report.static=await page.evaluate(()=>structuredClone(window.__kidneyMetrics));
assert.equal(report.static.windows.at(-1).dpr,.75);
assert(report.static.windows.filter(w=>w.dpr===.75).length>=3);
await page.mouse.up();await page.locator('[data-view="hilum"]').click();
assert(await page.locator('#kidney-fallback figure').nth(1).isVisible());
report.staticStatesReachable=true;await page.close();
const p=await browser.newPage();await p.goto(base);await p.locator('#enable-3d').click();await p.waitForFunction(()=>window.__kidneyMetrics?.paintedPixels>0);
const other=await browser.newPage();await other.goto('about:blank');await other.bringToFront();
report.realVisibilityState=await p.evaluate(()=>document.visibilityState);
if(report.realVisibilityState!=='hidden'){
  // Headless Chromium keeps pages visible; verify the application's event path explicitly.
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  report.hiddenTest='getter hidden injetado: headless não ocultou a aba real';
}else report.hiddenTest='aba real oculta';
const start=await p.evaluate(()=>window.__kidneyMetrics.renderCount);
await p.locator('[data-view="hilum"]').dispatchEvent('click');await p.waitForTimeout(250);
report.hiddenFrames=(await p.evaluate(()=>window.__kidneyMetrics.renderCount))-start;assert.equal(report.hiddenFrames,0);
await other.close();await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
await p.locator('canvas').evaluate(c=>{window.__qaGL=c.getContext('webgl2');window.dispatchEvent(new PageTransitionEvent('pagehide'));});
await p.waitForTimeout(200);report.contextReleased=await p.evaluate(()=>window.__qaGL.isContextLost());assert(report.contextReleased);await p.close();
const noGL=await browser.newPage();await noGL.addInitScript(()=>{
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args);};
});
await noGL.goto(base);await noGL.locator('#enable-3d').click();await noGL.waitForFunction(()=>window.__kidneyMetrics?.mode==='static-fallback');
report.noWebGL=await noGL.locator('#kidney-fallback img').first().isVisible();assert(report.noWebGL);
await browser.close();await writeFile('docs/evidencias/rim-procedural/lifecycle.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({singleSpike:report.singleSpike.mode,reduced:report.reduced.mode,static:report.static.mode,hidden:report.hiddenTest,contextReleased:report.contextReleased,noWebGL:report.noWebGL}));
