import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const base=process.env.RIM_URL || 'http://127.0.0.1:4328';
await mkdir('docs/evidencias/rim-procedural',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:2,colorScheme:'light',reducedMotion:'reduce'});
page.on('pageerror',e=>console.error(e));
page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
await page.goto(base);
await page.locator('#enable-3d').click();
await page.waitForFunction(()=>window.__kidneyMetrics?.paintedPixels>0);
await page.locator('#kidney-stage').scrollIntoViewIfNeeded();
for(const view of ['position','hilum']){
  await page.locator(`[data-view="${view}"]`).click();
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.locator('#kidney-stage').screenshot({path:`docs/evidencias/rim-procedural/${view}.png`});
  const data=await page.locator('#kidney-stage canvas').evaluate(c=>c.toDataURL('image/png').split(',')[1]);
  await sharp(Buffer.from(data,'base64')).resize(560,420,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:85}).toFile(`public/assets/kidney-${view}.webp`);
}
console.log(await page.evaluate(()=>window.__kidneyMetrics));
await browser.close();
