import {mkdir,writeFile} from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
import {join} from 'node:path'
import {playwright,localCookie,origin,root} from './runtime.mjs'
import {pilot} from './pilot.mjs'
import {scenarios} from './scenarios.mjs'

// No production grant, trace, token, or uploaded customer photo is written.
const ids=process.argv.slice(2)
const chosen=[pilot,...scenarios].filter(s=>!ids.length || ids.includes(s.id))
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/private/tmp/wallace-preview-browsers'
const {chromium}=await playwright()
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']})
// Warm every entry before recording. Vite's first import of a new dependency
// can otherwise reload an unrelated active recording during optimization.
const warm=await browser.newContext()
await warm.addCookies([await localCookie()])
await warm.route('**/api/**',route=>route.request().method()==='POST'?route.abort():route.continue())
const warmPage=await warm.newPage()
for(const scenario of [pilot,...scenarios])await warmPage.goto(`${origin}${scenario.path}`,{waitUntil:'networkidle'})
await warm.close()
console.log('All demo entries warmed before recording')
try { for(const scenario of chosen) {
  const out=join(root,'output/contractor-previews',scenario.id)
  const clips=join(root,'videos/contractor-previews',scenario.id,'clips')
  await mkdir(out,{recursive:true}); await mkdir(clips,{recursive:true})
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:1440,height:900}}})
  await context.addCookies([await localCookie()])
  await context.route('**/api/**',route=>route.request().method()==='POST'?route.abort():route.continue())
  const page=await context.newPage()
  const recordStart=Date.now()
  const errors=[]; page.on('pageerror',error=>errors.push(error.message))
  await page.goto(`${origin}${scenario.path}`,{waitUntil:'networkidle'})
  if(page.url().includes('/request-demo')) throw new Error(`${scenario.id}: local capture grant was not accepted`)
  await page.evaluate(()=>document.fonts.ready)
  await page.waitForTimeout(2000)
  const timings=[]
  for(let index=0;index<scenario.scenes.length;index++) {
    const scene=scenario.scenes[index]
    const target=page.locator(scene.focus).first()
    await target.waitFor({state:'visible',timeout:10000})
    await target.evaluate(el=>{const y=el.getBoundingClientRect().top+window.scrollY-90;window.scrollTo({top:Math.max(0,y),behavior:'instant'})})
    await page.waitForTimeout(1200)
    const start=Date.now()
    const documentStart=await page.evaluate(()=>performance.timeOrigin)
    await page.screenshot({path:join(out,`scene-${index+1}-start.png`)})
    for(let actionIndex=0;actionIndex<scene.actions.length;actionIndex++) {
      const action=scene.actions[actionIndex]
      await page.waitForTimeout(1600)
      const locator=action.selector?page.locator(action.selector).first():null
      if(action.kind==='click') await locator.click({timeout:7000})
      else if(action.kind==='fill') {await locator.fill(action.value);await locator.press('Tab')}
      else if(action.kind==='select') await locator.selectOption(action.value)
      else if(action.kind==='goto') await page.goto(`${origin}${action.path}`,{waitUntil:'networkidle'})
      else if(action.kind==='scroll') await page.evaluate(y=>window.scrollTo({top:y,behavior:'smooth'}),action.y)
      else if(action.kind==='range') {
        const box=await locator.boundingBox(); if(!box)throw new Error('Range has no box')
        const current=Number(await locator.inputValue()); const next=Number(action.value)
        await page.mouse.move(box.x+box.width*current/100,box.y+box.height/2)
        await page.mouse.down();await page.mouse.move(box.x+box.width*next/100,box.y+box.height/2,{steps:40});await page.mouse.up()
      } else throw new Error(`Unsupported action ${action.kind}`)
    }
    await page.waitForTimeout(Math.max(0,12000-(Date.now()-start)))
    if(!scene.actions.some(action=>action.kind==='goto') && await page.evaluate(()=>performance.timeOrigin)!==documentStart)throw new Error(`${scenario.id}: page reloaded during chapter ${index+1}; do not produce media while recording on an unfiltered dev server`)
    if(scene.expect)await page.locator(scene.expect).waitFor({state:'visible',timeout:3000})
    await page.screenshot({path:join(out,`scene-${index+1}-end.png`)})
    timings.push({chapter:index+1,startSeconds:(start-recordStart)/1000,duration:12,focus:scene.focus,actions:scene.actions})
    console.log(`${scenario.id}: chapter ${index+1} captured`)
  }
  const video=page.video(); await context.close(); const videoPath=await video.path()
  for(const timing of timings) execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(timing.startSeconds),'-i',videoPath,'-t','12','-vf','fps=24,tpad=stop_mode=clone:stop_duration=1','-c:v','libx264','-preset','fast','-crf','19','-g','24','-pix_fmt','yuv420p','-an','-movflags','+faststart',join(clips,`${timing.chapter}.mp4`)],{stdio:'inherit'})
  await writeFile(join(out,'evidence.json'),JSON.stringify({id:scenario.id,origin,path:scenario.path,viewport:{width:1440,height:900},timings,errors,sampleDisclosure:scenario.disclosure,recording:'Real local UI; all POST /api requests blocked; sample inputs only'},null,2))
  console.log(`${scenario.id}: 3 captured clips ready; ${errors.length} browser errors`)
} } finally {await browser.close()}
