import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {execFileSync,spawnSync} from 'node:child_process'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {playwright,localCookie,origin,root} from './runtime.mjs'
import {narratedPilot} from './narrated-pilot.mjs'

const arguments_=process.argv.slice(2)
const batch=arguments_.includes('--batch')
const warm=arguments_.includes('--warm')
const unknownFlag=arguments_.find(value=>value.startsWith('--')&&!['--batch','--warm'].includes(value))
if(unknownFlag)throw new Error(`Unknown capture option ${unknownFlag}`)
const requested=arguments_.filter(value=>!value.startsWith('--'))
if(batch){
 if(!requested.length)throw new Error('Usage: narrated-capture.mjs --batch <id> [id ...] [--warm]')
 const {narratedScenarios}=await import('./narrated-scenarios.mjs')
 const known=new Set([narratedPilot.id,...narratedScenarios.map(s=>s.id)])
 for(const id of requested)if(!known.has(id))throw new Error(`Unknown scenario ${id}`)
 if(new Set(requested).size!==requested.length)throw new Error('Pass each capture ID only once')
 const results=[]
 for(let i=0;i<requested.length;i++){
  const id=requested[i]
  console.log(`Starting ${id} (${i+1}/${requested.length})`)
  const child=spawnSync(process.execPath,[fileURLToPath(import.meta.url),id,...(warm&&i===0?['--warm']:[])],{cwd:root,env:process.env,stdio:'inherit'})
  results.push({id,status:child.status===0?'passed':'failed',exitCode:child.status,signal:child.signal||null,...(child.error?{error:child.error.message}:{})})
  // A capture failure should not discard the other requested films. An
  // interrupted child, however, must not launch more browser work.
  if(child.signal)break
 }
 console.log(JSON.stringify({mode:'sequential capture batch',results,pending:requested.slice(results.length)},null,2))
 process.exit(results.length===requested.length&&results.every(result=>result.status==='passed')?0:1)
}
if(requested.length>1)throw new Error('Use --batch to capture more than one film')
const id=requested[0]||'velar'
let scenario=narratedPilot
if(id!=='velar'){
 const {narratedScenarios}=await import('./narrated-scenarios.mjs')
 scenario=narratedScenarios.find(s=>s.id===id)
}
if(!scenario)throw new Error(`Unknown scenario ${id}`)
const out=join(root,'output/narrated-previews',id)
const clips=join(root,'videos/contractor-previews',id,'clips')
await mkdir(out,{recursive:true});await mkdir(clips,{recursive:true})
let timings
try{timings=JSON.parse(await readFile(join(root,'videos/contractor-previews/narrated/audio',id,'timing.json'),'utf8'))}catch{}
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/private/tmp/wallace-preview-browsers'
const {chromium}=await playwright()
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']})
if(warm){
 const warm=await browser.newContext()
 await warm.addCookies([await localCookie()])
 await warm.route('**/api/**',r=>r.request().method()==='POST'?r.abort():r.continue())
 const warmPage=await warm.newPage()
 for(const path of ['/northvane','/alder-stone','/contour','/halcyon','/velar','/stratum','/tambour','/mitre','/stillwater','/datum','/roofing-dashboard'])await warmPage.goto(`${origin}${path}`,{waitUntil:'networkidle'})
 await warm.close()
 console.log('All eleven demo entries warmed before recording')
}
const context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:1600,height:900}}})
await context.addCookies([await localCookie()])
await context.route('**/api/**',r=>r.request().method()==='POST'?r.abort():r.continue())
const page=await context.newPage()
const recordStart=Date.now(),errors=[]
page.on('pageerror',e=>errors.push(e.message))
async function action(a){
 const el=a.selector?page.locator(a.selector).first():null
 if(a.kind==='click')await el.click({timeout:8000})
 else if(a.kind==='check')await el.check({timeout:8000})
 else if(a.kind==='fill'){await el.fill(a.value);await el.press('Tab')}
 else if(a.kind==='select')await el.selectOption(a.value)
 else if(a.kind==='upload'){await el.setInputFiles(join(root,a.file));await page.waitForTimeout(500)}
 else if(a.kind==='goto')await page.goto(`${origin}${a.path}`,{waitUntil:'networkidle'})
 else if(a.kind==='scrollTo')await el.evaluate(e=>e.scrollIntoView({behavior:'smooth',block:'center'}))
 else if(a.kind==='scrollProgress')await el.evaluate((e,p)=>window.scrollTo({top:e.getBoundingClientRect().top+window.scrollY+(e.scrollHeight-window.innerHeight)*p,behavior:'smooth'}),a.value)
 else if(a.kind==='wheel')await page.mouse.wheel(0,a.value)
 else if(a.kind==='range'){
  const box=await el.boundingBox(),current=Number(await el.inputValue()),next=Number(a.value)
  const min=Number(await el.getAttribute('min')||0),max=Number(await el.getAttribute('max')||100)
  await page.mouse.move(box.x+box.width*(current-min)/(max-min),box.y+box.height/2)
  await page.mouse.down();await page.mouse.move(box.x+box.width*(next-min)/(max-min),box.y+box.height/2,{steps:35});await page.mouse.up()
 }else if(a.kind==='wait')await page.waitForTimeout(a.ms)
 else if(a.kind==='press')await el.press(a.key)
 else throw new Error(`Unsupported action ${a.kind}`)
}
const evidence=[]
try{
 await page.goto(`${origin}${scenario.path}`,{waitUntil:'networkidle'})
 if(page.url().includes('request-demo'))throw new Error('Capture grant rejected')
 await page.evaluate(()=>document.fonts.ready)
 await page.waitForTimeout(1500)
 for(let i=0;i<scenario.scenes.length;i++){
  const scene=scenario.scenes[i]
  for(const a of scene.setup||[])await action(a)
  let focus=page.locator(scene.focus).first()
  if(!await focus.count()&&scene.fallbackFocus)focus=page.locator(scene.fallbackFocus).first()
  await focus.waitFor({state:'visible',timeout:10000})
  if(!scene.preserveScroll)await focus.evaluate(e=>{const b=e.getBoundingClientRect();window.scrollTo({top:Math.max(0,window.scrollY+b.top-(b.height<680?(900-b.height)/2:85)),behavior:'instant'})})
  await page.waitForTimeout(1000)
  const start=Date.now(),timeOrigin=await page.evaluate(()=>performance.timeOrigin)
  // Capture long enough for the actual spoken explanation; never slow speech to fill footage.
  const audioScene=timings?.scenes?.find(s=>s.id===scene.id)
  const duration=scene.captureDuration||Math.max(5,(audioScene?.duration||scene.spoken.split(/\s+/).length/2)+1)
  await page.screenshot({path:join(out,`${scene.id}-start.png`)})
  const actions=[]
  for(let j=0;j<scene.actions.length;j++){
   const a=scene.actions[j],at=a.at??.8+j*Math.max(.8,(duration-2.6)/Math.max(1,scene.actions.length))
   await page.waitForTimeout(Math.max(0,at*1000-(Date.now()-start)))
   await action(a)
   actions.push({...a,at:(Date.now()-start)/1000})
  }
  await page.waitForTimeout(Math.max(800,duration*1000-(Date.now()-start)))
  if(await page.evaluate(()=>performance.timeOrigin)!==timeOrigin&&!scene.actions.some(a=>a.kind==='goto'))throw new Error(`${id}/${scene.id}: reload during recording`)
  if(scene.expect)await page.locator(scene.expect).first().waitFor({state:'visible'})
  await page.screenshot({path:join(out,`${scene.id}-end.png`)})
  const box=await focus.boundingBox().catch(()=>null)
  evidence.push({id:scene.id,startSeconds:(start-recordStart)/1000,duration:(Date.now()-start)/1000,actions,focus:scene.focus,box,text:(await page.locator('body').innerText()).slice(-18000)})
  console.log(`${id}/${scene.id}: captured ${evidence.at(-1).duration.toFixed(1)}s`)
 }
 const video=page.video();await context.close();const path=await video.path()
 for(const shot of evidence)execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(shot.startSeconds),'-i',path,'-t',String(shot.duration),'-vf','fps=24','-c:v','libx264','-preset','fast','-crf','18','-g','24','-pix_fmt','yuv420p','-an','-movflags','+faststart',join(clips,`narrated-${shot.id}.mp4`)],{stdio:'inherit'})
 await writeFile(join(out,'evidence.json'),JSON.stringify({id,origin,viewport:{width:1600,height:900},errors,shots:evidence,externalCalls:'All POST /api requests blocked; sample data only'},null,2))
}finally{await browser.close()}
