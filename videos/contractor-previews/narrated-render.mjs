import {mkdir,open,readFile,writeFile,rename} from 'node:fs/promises'
import {execFileSync,spawnSync} from 'node:child_process'
import {join} from 'node:path'
import {root} from './runtime.mjs'
import {fingerprintComposition,assertCheckedProof} from './narrated-check-proof.mjs'
const renderChecked=process.argv.includes('--render-checked')
const ids=process.argv.slice(2).filter(arg=>arg!=='--render-checked')
if(!ids.length)throw new Error('Pass one or more verified film IDs')
if(ids.some(id=>!/^[a-z0-9-]+$/.test(id)))throw new Error('Invalid film ID or unsupported option')
if(renderChecked&&process.env.CHECK_ONLY==='1')throw new Error('--render-checked cannot be combined with CHECK_ONLY=1')
const cli=process.env.HYPERFRAMES_CLI||'/Users/matthewwallace/.npm/_npx/702923228c2ce1e6/node_modules/hyperframes/bin/hyperframes.mjs'
for(const id of ids){
 const folder=join(root,'videos/contractor-previews',id),out=join(root,'output/narrated-previews',id)
 await mkdir(out,{recursive:true})
 const timelineFile=join(out,'edit-timeline.json')
 const timeline=JSON.parse(await readFile(timelineFile,'utf8'))
 const call=async(args,name)=>{const log=await open(join(out,name),'w');try{execFileSync(process.execPath,[cli,...args],{cwd:root,env:{...process.env,DO_NOT_TRACK:'1'},stdio:['ignore',log.fd,log.fd]})}finally{await log.close()}}
 const times=timeline.shots.map(s=>(s.start+s.duration*.65).toFixed(2)).join(',')
 const checkOptions={samples:Math.max(8,timeline.shots.length),snapshots:true,heroFrameTimes:times}
 const proofFile=join(out,'checked-composition.json')
 const before=await fingerprintComposition({folder,timelineFile,cli,checkOptions})
 if(renderChecked){
  let proof
  try{proof=JSON.parse(await readFile(proofFile,'utf8'))}catch{throw new Error(`${id}: missing or unreadable check proof; run CHECK_ONLY=1 first.`)}
  assertCheckedProof(proof,before,id)
  console.log(`${id}: recorded checks match all current composition hashes; skipping duplicate checks and snapshots`)
 }else{
  await call(['check',folder,'--samples',String(checkOptions.samples),'--snapshots'],'check.log')
  console.log(`${id}: full composition check passed`)
  await call(['snapshot',folder,'--at',times],'snapshots.log')
  console.log(`${id}: hero-frame snapshots ready`)
  const after=await fingerprintComposition({folder,timelineFile,cli,checkOptions})
  if(before.fingerprint!==after.fingerprint)throw new Error(`${id}: composition changed while checking; no proof written. Run CHECK_ONLY=1 again.`)
  const proof={...after,id,status:'checks_and_snapshots_passed',checkedAt:new Date().toISOString(),visualReview:'Not asserted by this proof. Review the produced snapshots before rendering.'}
  await writeFile(`${proofFile}.pending`,JSON.stringify(proof,null,2)+'\n')
  await rename(`${proofFile}.pending`,proofFile)
 }
 if(process.env.CHECK_ONLY==='1')continue
 const master=join(out,'master.mp4')
 await call(['render',folder,'--output',master,'--fps','24','--quality','high','--workers',process.env.RENDER_WORKERS||'2','--video-frame-format','png'],'render.log')
 const rendered=await fingerprintComposition({folder,timelineFile,cli,checkOptions})
 if(rendered.fingerprint!==before.fingerprint)throw new Error(`${id}: composition changed during rendering; delivery encoding stopped. Check and render the current files again.`)
 const dest=join(root,'public/media/demo-previews',`${id}.mp4`)
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',master,'-i',join(folder,'soundtrack.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','22','-g','48','-keyint_min','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-ar','48000','-ac','2','-t',String(timeline.total),'-movflags','+faststart',dest],{stdio:'inherit'})
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',join(out,`${timeline.shots[0].id}-start.png`),'-vf','scale=1200:675','-frames:v','1','-q:v','3',join(root,'public/media/demo-previews',`${id}.jpg`)],{stdio:'inherit'})
 const probe=JSON.parse(execFileSync('ffprobe',['-v','quiet','-show_format','-show_streams','-of','json',dest],{encoding:'utf8'}))
 const audio=probe.streams.find(s=>s.codec_type==='audio'),video=probe.streams.find(s=>s.codec_type==='video')
 if(!audio||audio.codec_name!=='aac'||Number(audio.sample_rate)!==48000||audio.channels!==2)throw new Error('Missing or unexpected delivery audio format')
 if(!video||video.codec_name!=='h264'||video.width!==1920||video.height!==1080||video.pix_fmt!=='yuv420p')throw new Error('Unexpected delivery video format')
 if(Math.abs(Number(probe.format.duration)-timeline.total)>.15)throw new Error('Runtime mismatch')
 // Measure the decoded AAC delivery, not just the source WAV. Audio presence
 // alone would pass a silent or clipped soundtrack.
 const measurement=spawnSync('ffmpeg',['-hide_banner','-nostats','-i',dest,'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json','-f','null','-'],{encoding:'utf8'})
 if(measurement.status!==0)throw new Error(`Delivery audio measurement failed: ${measurement.stderr}`)
 const match=measurement.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)
 if(!match)throw new Error('Delivery loudness measurement was not returned')
 const loudness=JSON.parse(match[0])
 await writeFile(join(out,'delivery-loudness.json'),JSON.stringify({id,measurement:'Decoded delivery AAC; loudnorm input measurements',integratedLufs:Number(loudness.input_i),truePeakDbtp:Number(loudness.input_tp),loudnessRangeLu:Number(loudness.input_lra),raw:loudness},null,2))
 if(!Number.isFinite(Number(loudness.input_i))||Math.abs(Number(loudness.input_i)+16)>2)throw new Error('Delivery audio is silent or outside the -16 LUFS ±2 target; review the mix')
 if(!Number.isFinite(Number(loudness.input_tp))||Number(loudness.input_tp)>-0.5)throw new Error('Delivery audio has insufficient true-peak headroom; review the mix')
 await writeFile(join(out,'delivery-probe.json'),JSON.stringify(probe,null,2))
 console.log(`${id}: ${probe.format.duration}s narrated1080p delivery ready`)
}
