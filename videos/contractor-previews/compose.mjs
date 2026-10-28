import {writeFile,mkdir,copyFile} from 'node:fs/promises'
import {join} from 'node:path'
import {root} from './runtime.mjs'
import {pilot} from './pilot.mjs'
import {scenarios} from './scenarios.mjs'

const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const ids=process.argv.slice(2)
const destination=join(root,'public/media/demo-previews')
await mkdir(destination,{recursive:true})
for(const scenario of [pilot,...scenarios].filter(s=>!ids.length||ids.includes(s.id))) {
  const folder=join(root,'videos/contractor-previews',scenario.id)
  await mkdir(folder,{recursive:true})
  await copyFile(join(root,'node_modules/gsap/dist/gsap.min.js'),join(folder,'gsap.min.js'))
  for(const font of ['manrope-400.ttf','manrope-700.ttf','instrument-serif.ttf']) await copyFile(join(root,'videos/contractor-previews/fonts',font),join(folder,font))
  const html=`<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1920,height=1080"><title>${escape(scenario.name)} — product preview</title><script src="gsap.min.js"></script>
<style>
@font-face{font-family:Manrope;font-style:normal;font-weight:400 600;src:url('manrope-400.ttf')}@font-face{font-family:Manrope;font-style:normal;font-weight:700 900;src:url('manrope-700.ttf')}@font-face{font-family:'Instrument Serif';font-style:normal;font-weight:400;src:url('instrument-serif.ttf')}
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#080d12;color:#edf1f2;font-family:Manrope,Arial,sans-serif}h1,h2,p{margin:0}
#root{width:1920px;height:1080px;display:flex;flex-direction:column;padding:30px 32px 24px;gap:24px}
.identity{display:flex;align-items:center;justify-content:space-between;height:40px;flex:none;color:#c3d0d8;font-size:28px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.identity strong{color:#edf1f2}.identity span{font-size:28px;letter-spacing:.1em}
.body{display:grid;grid-template-columns:1392px 1fr;gap:32px;flex:1;min-height:0}.stage{position:relative;align-self:center;width:1392px;height:870px;overflow:hidden;border:1px solid #52616b;border-radius:12px;background:#121a21}.stage video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.stage video:not(:first-child){opacity:0}
.sidebar{display:flex;flex-direction:column;justify-content:space-between;padding:24px 0 20px;gap:28px}.brand h1{font-family:'Instrument Serif',Georgia,serif;font-size:59px;line-height:1.03;font-weight:400;letter-spacing:-.025em}.brand p{font-size:28px;line-height:1.55;color:#c3d0d8;margin-top:20px}.chapters{display:grid;flex:1;align-items:center}.copy{grid-area:1/1;display:flex;flex-direction:column;gap:24px;justify-content:center;width:100%;padding:0}.copy:not(:first-child){opacity:0}.number{font-size:28px;color:#4fa8ff;font-weight:700;letter-spacing:.15em}.copy h2{font-size:42px;line-height:1.1;font-weight:700;letter-spacing:-.02em}.copy .caption{font-size:31px;line-height:1.45;color:#edf1f2}.access{font-size:28px;line-height:1.5;color:#c3d0d8;border-top:1px solid #52616b;padding-top:22px}.access strong{color:#edf1f2;display:block;font-size:28px;margin-bottom:5px}
.footer{display:flex;flex-direction:column;gap:17px;flex:none}.disclosure{font-size:28px;line-height:1.35;color:#c3d0d8}.progress{height:4px;background:#52616b;overflow:hidden}.progress span{display:block;background:#4fa8ff;width:100%;height:100%;transform-origin:left}
</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="36" data-width="1920" data-height="1080" data-fps="24">
<div class="identity"><strong>Wallace Shift / Demo collection</strong><span>Real interface · Guided preview · 00:36</span></div>
<div class="body"><div class="stage">${scenario.scenes.map((scene,index)=>`<video id="video-${index}" class="clip" data-start="${index*12}" data-duration="${index===2?12:12.5}" data-track-index="${index}" src="clips/${index+1}.mp4" muted playsinline preload="auto"></video>`).join('')}</div>
<aside class="sidebar"><div class="brand"><h1>${escape(scenario.name)}</h1><p>${escape(scenario.tagline)}</p></div><div class="chapters">${scenario.scenes.map((scene,index)=>`<section class="copy" id="copy-${index}"><p class="number">0${index+1} / 03</p><h2>${escape(scene.title)}</h2><p class="caption">${escape(scene.caption)}</p></section>`).join('')}</div><p class="access"><strong>Watch freely. Explore further.</strong>Request access to try the interactive demo.</p></aside></div>
<div class="footer"><p class="disclosure">${escape(scenario.disclosure)}</p><div class="progress"><span id="progress"></span></div></div></div>
<script>
window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});
tl.from('.identity',{opacity:0,y:12,duration:.55,ease:'power2.out'},.15);
tl.from('.brand',{opacity:0,x:22,duration:.65,ease:'power3.out'},.2);
tl.from('.access',{opacity:0,y:14,duration:.6,ease:'sine.out'},.4);
tl.from('.disclosure',{opacity:0,y:9,duration:.55,ease:'power2.out'},.3);
tl.from('#progress',{scaleX:0,duration:36,ease:'none'},0);
${scenario.scenes.map((_,index)=>`tl.from('#copy-${index} .number',{opacity:0,x:18,duration:.45,ease:'power2.out'},${index*12+.2});tl.from('#copy-${index} h2',{opacity:0,y:16,duration:.6,ease:'power3.out'},${index*12+.35});tl.from('#copy-${index} .caption',{opacity:0,y:12,duration:.6,ease:'sine.out'},${index*12+.55});${index?`tl.to('#video-${index-1}',{opacity:0,duration:.4,ease:'power2.inOut'},${index*12});tl.fromTo('#video-${index}',{opacity:0},{opacity:1,duration:.4,ease:'power2.inOut'},${index*12});tl.to('#copy-${index-1}',{opacity:0,duration:.3,ease:'power2.inOut'},${index*12});tl.to('#copy-${index}',{opacity:1,duration:.3,ease:'power2.inOut'},${index*12});`:''}`).join('\n')}
window.__timelines.main=tl;
</script></body></html>`
  await writeFile(join(folder,'index.html'),html)
  await writeFile(join(folder,'package.json'),JSON.stringify({name:`contractor-preview-${scenario.id}`,private:true,type:'module',scripts:{dev:'npx --yes hyperframes@0.8.210 preview',check:'npx --yes hyperframes@0.8.210 check',render:'npx --yes hyperframes@0.8.210 render --fps 24 --quality high'}},null,2)+'\n')
  await writeFile(join(folder,'hyperframes.json'),JSON.stringify({media:{autoProxy:false}},null,2)+'\n')
  await writeFile(join(destination,`${scenario.id}.vtt`),'WEBVTT\n\n'+scenario.scenes.map((scene,index)=>`${index+1}\n00:${String(index*12).padStart(2,'0')}.000 --> 00:${String((index+1)*12).padStart(2,'0')}.000\n${scene.title}. ${scene.caption}\n${scenario.disclosure}.\n`).join('\n'))
  console.log(`${scenario.id}: editable composition and captions generated`)
}
