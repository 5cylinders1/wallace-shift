import {execFileSync} from 'node:child_process'
import {mkdir,open,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {root} from './runtime.mjs'
import {pilot} from './pilot.mjs'
import {scenarios} from './scenarios.mjs'

const ids=process.argv.slice(2)
const cli=process.env.HYPERFRAMES_CLI
const env={...process.env,DO_NOT_TRACK:'1'}
await mkdir(join(root,'public/media/demo-previews'),{recursive:true})
for(const scene of [pilot,...scenarios].filter(s=>!ids.length||ids.includes(s.id))) {
  const folder=join(root,'videos/contractor-previews',scene.id)
  const output=join(root,'output/contractor-previews',scene.id)
  await mkdir(output,{recursive:true})
  const invoke=(args,log)=> {
    const command=cli?process.execPath:'npx'
    const options=cli?[cli,...args]:['--yes','hyperframes@0.8.210',...args]
    execFileSync(command,options,{cwd:root,env,stdio:['ignore',log,log]})
  }
  const check=await open(join(output,'hyperframes-check.log'),'w')
  try{invoke(['check',folder,'--samples','5','--snapshots'],check.fd)}finally{await check.close()}
  console.log(`${scene.id}: composition checks passed`)
  const render=await open(join(output,'hyperframes-render.log'),'w')
  const master=join(output,'master.mp4')
  try{invoke(['render',folder,'--output',master,'--fps','24','--quality','high','--workers','2','--video-frame-format','png'],render.fd)}finally{await render.close()}
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',master,'-c:v','libx264','-preset','medium','-crf','23','-g','48','-keyint_min','24','-pix_fmt','yuv420p','-an','-movflags','+faststart',join(root,'public/media/demo-previews',`${scene.id}.mp4`)],{stdio:'inherit'})
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',join(output,'scene-1-end.png'),'-vf','scale=1200:750,crop=1200:630:0:0','-frames:v','1','-q:v','3',join(root,'public/media/demo-previews',`${scene.id}.jpg`)],{stdio:'inherit'})
  const probe=JSON.parse(execFileSync('ffprobe',['-v','quiet','-show_format','-show_streams','-of','json',join(root,'public/media/demo-previews',`${scene.id}.mp4`)],{encoding:'utf8'}))
  if(Math.abs(Number(probe.format.duration)-36)>.1)throw new Error(`${scene.id}: incorrect duration`)
  await writeFile(join(output,'delivery-probe.json'),JSON.stringify(probe,null,2))
  console.log(`${scene.id}: 36-second public MP4 and poster ready (${(Number(probe.format.size)/1048576).toFixed(1)} MiB)`)
}
