import {readFile} from 'node:fs/promises'
import {createServer} from 'vite'
import {origin,root} from './runtime.mjs'

// Use the same local-only secret as the capture grant. Never print its value.
for(const line of (await readFile(new URL('../../.demo-preview.local',import.meta.url),'utf8')).split('\n')) {
  if(!line.includes('=') || line.trim().startsWith('#'))continue
  const at=line.indexOf('=')
  const key=line.slice(0,at).replace(/^export\s+/,'').trim()
  if(key)process.env[key]=line.slice(at+1).trim().replace(/^['"]|['"]$/g,'')
}
const url=new URL(origin)
if(url.protocol!=='http:' || !['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Local preview server only')
const server=await createServer({root,server:{host:url.hostname,port:Number(url.port)||5176,strictPort:true,watch:{ignored:['**/output/**','**/videos/**','**/public/media/demo-previews/**','**/docs/**']}}})
await server.listen()
console.log(`Local demo capture server: ${origin}`)
