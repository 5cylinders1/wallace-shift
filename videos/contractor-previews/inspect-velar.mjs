import {mkdir,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {playwright,localCookie,origin,root} from './runtime.mjs'
const out=join(root,'output/narrated-preview-research/velar')
await mkdir(out,{recursive:true})
const {chromium}=await playwright()
const browser=await chromium.launch({channel:'chrome',headless:true})
const context=await browser.newContext({viewport:{width:1440,height:900}})
await context.addCookies([await localCookie()])
await context.route('**/api/**',r=>r.request().method()==='POST'?r.abort():r.continue())
const page=await context.newPage()
await page.goto(`${origin}/velar`,{waitUntil:'networkidle'})
await page.evaluate(()=>document.fonts.ready)
await page.waitForTimeout(1200)
const report=[]
for(const selector of ['.va-hero','.va-visualizer','#materials','#investment','#owner-portal','#consultation']){
 const el=page.locator(selector).first()
 await el.scrollIntoViewIfNeeded()
 await page.waitForTimeout(900)
 const filename=selector.replace(/[.#]/g,'')+'.png'
 await page.screenshot({path:join(out,filename)})
 report.push({selector,text:await el.innerText(),box:await el.boundingBox()})
}
await writeFile(join(out,'source-operation.json'),JSON.stringify(report,null,2))
console.log(report.map(x=>({selector:x.selector,box:x.box,text:x.text.slice(0,300)})))
await browser.close()
