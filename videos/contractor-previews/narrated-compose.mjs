import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
import assert from 'node:assert/strict'
import {join} from 'node:path'
import {root} from './runtime.mjs'
import {narratedPilot} from './narrated-pilot.mjs'

const id=process.argv[2]||'velar'
let scenario=narratedPilot
if(id!=='velar'){const {narratedScenarios}=await import('./narrated-scenarios.mjs');scenario=narratedScenarios.find(s=>s.id===id)}
if(!scenario)throw new Error('Unknown film')
const folder=join(root,'videos/contractor-previews',id),out=join(root,'output/narrated-previews',id)
await mkdir(out,{recursive:true})
const audioRoot=join(root,'videos/contractor-previews/narrated/audio',id)
const audio=JSON.parse(await readFile(join(audioRoot,'timing.json'),'utf8'))
const capture=JSON.parse(await readFile(join(out,'evidence.json'),'utf8'))
assert(audio.complete===true,'Narration import is incomplete; do not compose a partial take')
const probe=p=>JSON.parse(execFileSync('ffprobe',['-v','quiet','-show_format','-of','json',p],{encoding:'utf8'}))
const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const normalize=s=>s.replace(/\s+/g,' ').trim()
let position=0
const shots=scenario.scenes.map((s,i)=>{
 const spoken=audio.scenes.find(a=>a.id===s.id)
 if(!spoken)throw new Error(`Missing narration ${s.id}`)
 const raw=capture.shots.find(a=>a.id===s.id)
 assert(raw&&Number.isFinite(raw.duration)&&raw.duration>0,`Missing or invalid capture: ${s.id}`)
 assert(Number.isFinite(spoken.duration)&&spoken.duration>0,`Invalid narration duration: ${s.id}`)
 assert(normalize(spoken.spoken)===normalize(s.spoken),`Narration no longer matches the script: ${s.id}`)
 assert(Array.isArray(spoken.phrases)&&spoken.phrases.length,`Measured caption phrases are required: ${s.id}`)
 assert(normalize(spoken.phrases.map(p=>p.text).join(' '))===normalize(s.spoken),`Caption transcript differs from narration: ${s.id}`)
 for(let n=0;n<spoken.phrases.length;n++){
  const phrase=spoken.phrases[n]
  assert(Number.isFinite(phrase.start)&&Number.isFinite(phrase.end)&&phrase.start>=0&&phrase.end>phrase.start&&phrase.end<=spoken.duration+.03&&(!n||phrase.start>=spoken.phrases[n-1].end),`Invalid or overlapping caption timing: ${s.id}/${n+1}`)
 }
 // Keep the demonstrated action and its explanation, then cut the idle tail.
 const lastAction=Math.max(0,...(raw.actions||[]).map(action=>action.at||0))
 const duration=Math.ceil(Math.max(spoken.duration+.35,lastAction+.8)*24)/24
 const clipDuration=Math.ceil((duration+.4)*24)/24
 const source=join(folder,'clips',`narrated-${s.id}.mp4`)
 const sourceDuration=Number(probe(source).format.duration)
 assert(Number.isFinite(sourceDuration)&&sourceDuration>0,`Invalid source video duration: ${s.id}`)
 const endHold=Math.max(0,clipDuration-sourceDuration)
 // A short, explicit last-frame hold supports the dissolve. A longer shortage
 // needs fresh capture against the accepted narration, not a stretched gesture.
 assert(endHold<=2,`${s.id}: footage is ${endHold.toFixed(2)}s too short; recapture using the measured narration timing`)
 const clip=`clips/edit-${s.id}.mp4`
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,'-vf',`fps=24,tpad=stop_mode=clone:stop_duration=${endHold+1/24}`,'-t',String(clipDuration),'-c:v','libx264','-preset','fast','-crf','18','-g','24','-pix_fmt','yuv420p','-an','-movflags','+faststart',join(folder,clip)],{stdio:'inherit'})
 const result={...s,index:i,start:position,duration,clipDuration,clip,endHold,audio:spoken}
 position+=duration
 return result
})
// Let the actual final result remain visible for its full spoken explanation.
// The closing card follows it rather than obscuring it after the first second.
const endStart=position
const total=endStart+4.5
const args=['-hide_banner','-loglevel','error','-y'],filters=[],audioInputs=[]
for(const s of shots){
 const file=join(audioRoot,s.audio.file||`${s.id}.wav`)
 args.push('-i',file)
 filters.push(`[${s.index}:a]aresample=48000,adelay=${Math.round((s.start+.3)*1000)}:all=1[voice${s.index}]`)
 audioInputs.push(`[voice${s.index}]`)
}
args.push('-i',join(root,'videos/contractor-previews/narrated/music/A-kind-of-hope.mp3'))
filters.push(`[${shots.length}:a]atrim=start=12:end=${12+total},asetpts=PTS-STARTPTS,aresample=48000,volume=0.075,afade=t=in:d=1.5,afade=t=out:st=${total-2}:d=2[music]`)
filters.push(`${audioInputs.join('')}amix=inputs=${shots.length}:duration=longest:normalize=0,apad=whole_dur=${total}[voice]`)
filters.push(`[voice][music]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.89,loudnorm=I=-16:TP=-1.5:LRA=8,aresample=48000,apad=whole_dur=${total}[mix]`)
args.push('-filter_complex',filters.join(';'),'-map','[mix]','-t',String(total),'-ac','2',join(folder,'soundtrack.wav'))
execFileSync('ffmpeg',args,{stdio:'inherit'})
await copyFile(join(root,'node_modules/gsap/dist/gsap.min.js'),join(folder,'gsap.min.js'))
for(const f of ['manrope-400.ttf','manrope-700.ttf','instrument-serif.ttf'])await copyFile(join(root,'videos/contractor-previews/fonts',f),join(folder,f))
const captions=[]
for(const s of shots){
 const phrases=s.audio.phrases
 for(const p of phrases)captions.push({text:p.text,start:s.start+.3+p.start,end:Math.min(s.start+s.duration-.1,s.start+.3+(p.end??p.start+p.duration))})
}
const camera=s=>s.frame==='right'?{scale:1.85,origin:'100% 44%'}:s.frame==='left'?{scale:1.45,origin:'0% 44%'}:{scale:1,origin:'50% 45%'}
const html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>${xml(scenario.name)} — Wallace Shift walkthrough</title><script src="gsap.min.js"></script><style>
@font-face{font-family:Manrope;src:url('manrope-400.ttf');font-weight:400}@font-face{font-family:Manrope;src:url('manrope-700.ttf');font-weight:700}@font-face{font-family:Editorial;src:url('instrument-serif.ttf')}
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#080d12;color:#edf1f2;font-family:Manrope,Arial,sans-serif}p,h1,h2{margin:0}#film{width:1920px;height:1080px;position:relative;overflow:hidden}.camera{position:absolute;inset:0;width:1920px;height:1080px}.camera video{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}.scene-copy{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:30px 40px 202px;pointer-events:none}.top{display:flex;justify-content:space-between;gap:32px;align-items:start}.brand,.chapter{background:#080d12eb;padding:15px 22px;font-size:29px;font-weight:700;line-height:1.35;border-radius:4px}.brand{color:#edf1f2;white-space:nowrap}.brand span{font-weight:400;color:#c3d0d8;margin-left:22px}.chapter{max-width:870px;text-align:right}.label{align-self:flex-start;font-size:29px;line-height:1.4;background:#080d12ee;padding:13px 20px;max-width:1500px;border-left:4px solid ${scenario.accent}}.caption-band{position:absolute;left:0;right:0;bottom:0;height:180px;background:#080d12;z-index:60}.caption{position:absolute;left:0;right:0;bottom:0;height:180px;display:flex;align-items:center;justify-content:center;padding:16px 90px;font-size:56px;font-weight:700;line-height:1.22;text-align:center;z-index:61}.caption p{max-width:1700px}.end-card{position:absolute;inset:0;padding:145px 130px 215px;background:#080d12e8;display:flex;flex-direction:column;justify-content:center;gap:28px;z-index:50}.end-card .eyebrow{font-size:31px;letter-spacing:.14em;color:${scenario.accent}}.end-card h1{font-family:Editorial,serif;font-weight:400;font-size:124px;line-height:.98;max-width:1250px}.end-card .sub{font-size:39px;line-height:1.4;max-width:1300px}.credits{font-size:30px;color:#c3d0d8;line-height:1.45;margin-top:32px;max-width:1500px}.progress{position:absolute;bottom:180px;left:0;height:4px;width:100%;background:${scenario.accent};transform-origin:left;z-index:65}
</style></head><body><div id="film" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080" data-fps="24">
${shots.map(s=>`<div class="camera" id="camera-${s.index}" data-layout-ignore style="transform-origin:${camera(s).origin}"><video class="clip" id="shot-${s.index}" data-start="${s.start}" data-duration="${s.clipDuration}" data-track-index="${s.index}" src="${s.clip}" muted playsinline></video></div><section class="scene-copy clip" id="copy-${s.index}" data-start="${s.start}" data-duration="${s.duration}" data-track-index="${20+s.index}"><div class="top"><p class="brand">WALLACE SHIFT<span>${xml(scenario.name)}</span></p><p class="chapter">${xml(s.title)}</p></div><p class="label">${xml(s.label||scenario.disclosure)}</p></section>`).join('')}
<div class="caption-band" data-layout-ignore></div>
${captions.map((c,i)=>`<div id="caption-${i}" class="caption clip" data-start="${c.start}" data-duration="${c.end-c.start}" data-track-index="60"><p>${xml(c.text)}</p></div>`).join('')}
<section id="ending" class="end-card clip" data-start="${endStart}" data-duration="${total-endStart}" data-track-index="80"><p class="eyebrow">WALLACE SHIFT / ${xml(scenario.name)}</p><h1>Built around the whole experience.</h1><p class="sub">Explore the collection. Request access to try this concept.</p><p class="credits">Music: “A Kind Of Hope” · Scott Buckley · CC BY 4.0</p></section>
<div class="progress" id="progress" data-layout-ignore></div><audio id="soundtrack" data-start="0" data-duration="${total}" data-track-index="100" src="soundtrack.wav"></audio>
</div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});
${shots.map(s=>`tl.from('#camera-${s.index}',{opacity:${s.index===0?1:0},duration:.32,ease:'sine.inOut'},${s.start+.02});tl.fromTo('#camera-${s.index}',{scale:${camera(s).scale},y:${s.cameraY||0}},{scale:${camera(s).scale+(s.frame==='wide'?.025:.035)},y:${s.cameraY||0},duration:${s.duration},ease:'sine.inOut'},${s.start});tl.from('#copy-${s.index} .brand',{y:-10,opacity:0,duration:.35,ease:'power2.out'},${s.start+.12});tl.from('#copy-${s.index} .chapter',{x:15,opacity:0,duration:.4,ease:'power3.out'},${s.start+.18});tl.from('#copy-${s.index} .label',{y:12,opacity:0,duration:.4,ease:'sine.out'},${s.start+.24});`).join('\n')}
${captions.map((c,i)=>`tl.from('#caption-${i} p',{y:6,opacity:0,duration:.14,ease:'power2.out'},${c.start});`).join('\n')}
tl.from('#ending',{opacity:0,duration:.7,ease:'sine.inOut'},${endStart});tl.from('#ending h1',{y:25,opacity:0,duration:.7,ease:'power3.out'},${endStart+.2});tl.from('#ending .sub',{y:12,opacity:0,duration:.6,ease:'power2.out'},${endStart+.45});tl.from('#ending .eyebrow',{opacity:0,x:10,duration:.5,ease:'sine.out'},${endStart+.1});tl.from('#ending .credits',{opacity:0,duration:.5,ease:'sine.out'},${endStart+.5});tl.from('#progress',{scaleX:0,duration:${total},ease:'none'},0);window.__timelines.main=tl;</script></body></html>`
await writeFile(join(folder,'index.html'),html)
await writeFile(join(out,'edit-timeline.json'),JSON.stringify({id,total,shots:shots.map(s=>({id:s.id,start:s.start,duration:s.duration,clipDuration:s.clipDuration,endHold:s.endHold,spoken:s.spoken})),captions},null,2))
const stamp=t=>{const ms=Math.round(t*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`}
await writeFile(join(root,'public/media/demo-previews',`${id}.vtt`),'WEBVTT\n\n'+captions.map((c,i)=>`${i+1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n'))
console.log(JSON.stringify({id,total,shots:shots.length,captions:captions.length,audio:probe(join(folder,'soundtrack.wav')).format.duration}))
