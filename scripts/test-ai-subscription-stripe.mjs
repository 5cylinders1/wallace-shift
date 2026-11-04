/** Explicit sandbox integration check. Never touches the application Redis ledger. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import ts from 'typescript'

const root=fileURLToPath(new URL('../',import.meta.url))
const temporary=await mkdtemp(join(tmpdir(),'wallace-stripe-subscription-'))
const compiled=new Map(), savedEnv={...process.env}, realFetch=globalThis.fetch, RealDate=globalThis.Date
async function compile(relative){
 if(compiled.has(relative))return compiled.get(relative)
 const target=join(temporary,`${relative}.mjs`);compiled.set(relative,target)
 let source=ts.transpileModule(await readFile(join(root,relative),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText
 for(const match of [...source.matchAll(/(from\s+)(['"])(\.[^'"]+)\2/g)]){const path=await compile(join(dirname(relative),match[3].replace(/\.js$/,'.ts')));source=source.replace(match[0],`from ${JSON.stringify(pathToFileURL(path).href)}`)}
 await mkdir(dirname(target),{recursive:true});await writeFile(target,source);return target
}
const load=async file=>import(pathToFileURL(await compile(file)).href)
function setClock(day,hour=15){const value=RealDate.parse(`${day}T${String(hour).padStart(2,'0')}:00:00Z`);globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[value]))}static now(){return value}}}
const values=new Map(), intentRequests=[], refundRequests=[], refundOnly=process.argv.includes('--refund-only')
const ledger=()=>JSON.parse(values.get('portal:engagements')??'[]')
try{
 const env=await readFile(join(root,'.env.local'),'utf8').catch(()=> '')
 for(const key of ['STRIPE_SECRET_KEY','STRIPE_PUBLISHABLE_KEY']){
  if(process.env[key])continue
  const line=env.split(/\r?\n/).find(value=>value.startsWith(`${key}=`))
  if(line)process.env[key]=line.slice(key.length+1).trim().replace(/^(['"])(.*)\1$/,'$2')
 }
 if(!/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY??''))throw new Error('A Stripe sandbox secret is required. Refusing absent or live credentials.')
 if(!/^pk_test_/.test(process.env.STRIPE_PUBLISHABLE_KEY??''))throw new Error('A matching Stripe sandbox publishable key is required.')
 Object.assign(process.env,{VERCEL_ENV:'development',STRIPE_WEBHOOK_SECRET:'whsec_local_sandbox_validation',DEMO_AUDIT_REDIS_URL:'https://ledger.invalid',DEMO_AUDIT_REDIS_TOKEN:'memory-only',AI_SERVICE_GATEWAY_SECRET:'sandbox-readiness-proof-only-0000000000000'})
 globalThis.fetch=async(url,init)=>{
  if(String(url)==='https://ledger.invalid'){
   const c=JSON.parse(init.body),[verb,key,value]=c
   if(verb==='GET')return Response.json({result:values.get(key)??null})
   if(verb==='SET'){values.set(key,value);return Response.json({result:'OK'})}
   if(verb==='EVAL'){const [,,,ledgerKey,before,next]=c;if((values.get(ledgerKey)??'[]')!==before)return Response.json({result:0});values.set(ledgerKey,next);return Response.json({result:1})}
   throw new Error('Unexpected in-memory ledger operation')
  }
  if(!String(url).startsWith('https://api.stripe.com/v1/'))throw new Error('Sandbox validation blocks all non-Stripe external traffic')
  if(String(url).endsWith('/payment_intents')&&init?.method==='POST'){
   const params=new URLSearchParams(init.body);params.delete('receipt_email');init={...init,body:params};intentRequests.push({url,init})
  }
  if(String(url).endsWith('/refunds')&&init?.method==='POST')refundRequests.push({url,init})
  return realFetch(url,init)
 }
 const {stripe,charge,reconcileIntent}=await load('api/_lib/portal-stripe.ts')
 const {changeAiSubscription,generateSubscriptionInvoice,subscriptionEntitlement}=await load('api/_lib/ai-subscription.ts')
 const {subscriptionPreview}=await load('src/client-portal/ai-subscription.ts')
 const {mutateLedger}=await load('api/_lib/portal-store.ts')
 const {purchasePhoneCredit}=await load('api/_lib/ai-subscription-topup.ts')
 const {processPhoneCreditRefunds}=await load('api/_lib/ai-subscription-refund.ts')
 const balance=await stripe('balance');assert.equal(balance.livemode,false,'Account must explicitly be in sandbox mode before any fixtures are created')
 const fixtureId=randomUUID()
 const customer=await stripe('customers',{name:`Codex subscription validation ${fixtureId}`,'metadata[validation]':'wallace-ai-subscription'},`validation-customer-${fixtureId}`)
 assert.equal(customer.livemode,false)
 const card=await stripe('payment_methods/pm_card_visa/attach',{customer:customer.id},`validation-card-${fixtureId}`)
 assert.equal(card.livemode,false)
 const results=[]
 if(!refundOnly){
 for(const [plan,amount,firstEnd,secondEnd] of [['monthly',75000,'2032-03-29','2032-04-29'],['six_months',405000,'2032-08-29','2033-02-28'],['yearly',720000,'2033-02-28','2034-02-28']]){
  setClock('2032-01-31',12)
  const id=randomUUID(),actor={email:'subscription-validation@example.test',admin:false}
  const e={id,revision:1,createdAt:new Date().toISOString(),client:'Sandbox validation',email:actor.email,title:'AI service sandbox validation',scope:'Sandbox only',exclusions:'Sandbox only',delivery:'Sandbox only',amount,cadence:plan,firstDue:'',endDate:'',state:'issued',agreement:'Sandbox fixture agreement',agreementHash:'sandbox-hash',signature:{name:'Sandbox fixture',email:actor.email,at:new Date().toISOString(),hash:'sandbox-hash',consent:'Sandbox validation only'},stripeCustomer:customer.id,paymentMethod:card.id,invoices:[],audit:[],aiSubscription:{version:1,plan,createdAt:new Date().toISOString(),changes:[],usage:[],readiness:{chatbot:true,phone:true,reference:'sandbox fixture',at:new Date().toISOString()}}}
  changeAiSubscription([e],{action:'subscription-start',id,consent:true,...subscriptionPreview(e.aiSubscription)},actor)
  assert.equal(e.aiSubscription.trialEnd,'2032-02-29');assert.equal(generateSubscriptionInvoice(e,'2032-02-28'),0)
  await mutateLedger(entries=>entries.push(e))
  const receipts=[]
  for(const [due,end] of [['2032-02-29',firstEnd],[firstEnd,secondEnd]]){
   setClock(due);await mutateLedger(entries=>{assert.equal(generateSubscriptionInvoice(entries.find(item=>item.id===id),due),1)})
   let current=ledger().find(item=>item.id===id);const invoice=current.invoices.at(-1)
   const intent=await charge(current,invoice,'http://localhost',true,0)
   assert.equal(intent.livemode,false);assert.equal(intent.status,'succeeded');assert.equal(intent.amount,amount)
   assert.equal(invoice.subscriptionPeriod.end,end)
   const original=intentRequests.at(-1)
   const replay=await realFetch(original.url,original.init).then(response=>response.json())
   assert.equal(replay.id,intent.id,'Stripe must reuse the exact PaymentIntent for an identical idempotency key')
   await reconcileIntent(intent);await reconcileIntent(intent)
   current=ledger().find(item=>item.id===id);assert.equal(current.aiSubscription.paidUntil,end);assert.equal(current.aiSubscription.nextDue,end)
   receipts.push({paymentIntent:intent.id,amount,status:intent.status,serviceStart:due,serviceEndExclusive:end})
  }
  await mutateLedger(entries=>changeAiSubscription(entries,{action:'cancel',id},actor))
  const canceled=ledger().find(item=>item.id===id)
  assert.equal(subscriptionEntitlement(canceled,firstEnd).allowed,true);assert.equal(subscriptionEntitlement(canceled,secondEnd).allowed,false);assert.equal(generateSubscriptionInvoice(canceled,secondEnd),0)
  results.push({plan,receipts,canceledWithoutFurtherRenewal:true})
 }
 // A canceled trial never reaches a Stripe payment request.
 setClock('2032-01-31',12);const canceledTrial=structuredClone(ledger()[0]);canceledTrial.id=randomUUID();canceledTrial.state='issued';canceledTrial.invoices=[];canceledTrial.autopay=undefined;canceledTrial.aiSubscription={version:1,plan:'monthly',createdAt:new Date().toISOString(),changes:[],usage:[],readiness:{chatbot:true,phone:true,reference:'sandbox fixture',at:new Date().toISOString()}}
 const actor={email:canceledTrial.email,admin:false};changeAiSubscription([canceledTrial],{action:'subscription-start',id:canceledTrial.id,consent:true,...subscriptionPreview(canceledTrial.aiSubscription)},actor);changeAiSubscription([canceledTrial],{action:'cancel',id:canceledTrial.id},actor)
 assert.equal(generateSubscriptionInvoice(canceledTrial,'2032-02-29'),0);assert.equal(intentRequests.length,6)
 }
 // Dedicated prepaid purchase/refund fixture also runs alone with --refund-only.
 // Its previously paid service interval is simulated; the $40 credit purchase
 // and $20 unused-credit refund below are real Stripe sandbox transactions.
 setClock('2032-03-01')
 const creditId=randomUUID(),creditActor={email:'subscription-validation@example.test',admin:false}
 const creditService={id:creditId,revision:1,createdAt:new Date().toISOString(),client:'Sandbox credit validation',email:creditActor.email,title:'AI credit sandbox validation',scope:'Sandbox only',exclusions:'Sandbox only',delivery:'Sandbox only',amount:75000,cadence:'monthly',firstDue:'2032-02-29',endDate:'',state:'issued',agreement:'Sandbox fixture agreement',agreementHash:'sandbox-hash',signature:{name:'Sandbox fixture',email:creditActor.email,at:new Date().toISOString(),hash:'sandbox-hash',consent:'Sandbox validation only'},stripeCustomer:customer.id,paymentMethod:card.id,invoices:[],audit:[],aiSubscription:{version:1,plan:'monthly',createdAt:new Date().toISOString(),changes:[],usage:[],readiness:{chatbot:true,phone:true,reference:'sandbox fixture',at:new Date().toISOString()},trialStart:'2032-01-31',trialEnd:'2032-02-29',trialStartedAt:'2032-01-31T12:00:00.000Z',trialEndsAt:'2032-02-29T14:00:00.000Z',billingAnchor:'2032-02-29',paidUntil:'2032-03-29',nextDue:'2032-03-29'}}
 await mutateLedger(entries=>entries.push(creditService))
 const purchase=await purchasePhoneCredit({action:'subscription-topup',id:creditId,requestId:randomUUID(),consent:true,total:4000},creditActor,'http://localhost')
 assert.equal(purchase.status,'succeeded');assert.equal(ledger().find(e=>e.id===creditId).aiSubscription.phoneCreditSeconds,6000)
 await mutateLedger(entries=>{const e=entries.find(item=>item.id===creditId);e.aiSubscription.phoneCreditSeconds=3000;changeAiSubscription(entries,{action:'cancel',id:creditId},creditActor)})
 assert.equal((await processPhoneCreditRefunds({engagementId:creditId})).attempted,0,'Refund must wait for the paid service to end')
 setClock('2032-03-29');assert.equal((await processPhoneCreditRefunds({engagementId:creditId})).sent,1)
 await processPhoneCreditRefunds({engagementId:creditId});assert.equal(refundRequests.length,1,'Replay must not create another refund request')
 const creditInvoice=ledger().find(e=>e.id===creditId).invoices.at(-1),refund=creditInvoice.subscriptionCredit.refunds[0]
 assert.equal(refund.state,'sent');assert.equal(refund.amount,2000);assert.equal(refund.seconds,3000)
 const replayRefund=await realFetch(refundRequests[0].url,refundRequests[0].init).then(response=>response.json());assert.equal(replayRefund.id,refund.refundId)
 const verifiedRefund=await stripe(`refunds/${refund.refundId}`);assert.equal(verifiedRefund.status,'succeeded');assert.equal(verifiedRefund.amount,2000)
 const refundedIntent=await stripe(`payment_intents/${creditInvoice.paymentIntent}?expand[]=latest_charge`);assert.equal(refundedIntent.latest_charge.amount_refunded,2000);await reconcileIntent(refundedIntent)
 assert.equal(ledger().find(e=>e.id===creditId).aiSubscription.creditReviewRequired,undefined)
 assert.equal(intentRequests.length,refundOnly?1:7)
 results.push({prepaidCredit:{paymentIntent:creditInvoice.paymentIntent,amount:4000,status:purchase.status},unusedCreditRefund:{refundId:refund.refundId,amount:refund.amount,status:verifiedRefund.status,seconds:refund.seconds},repeatCreatesNoAdditionalRefund:true})
 console.log(JSON.stringify({sandbox:true,customer:customer.id,paymentMethod:card.id,results,...(!refundOnly?{trialCancellationCreatesNoPayment:true}:{}),applicationLedger:'in-memory only',clock:'application UTC dates simulated; Stripe payments and refunds are real sandbox objects'},null,2))
}finally{
 globalThis.Date=RealDate;globalThis.fetch=realFetch
 for(const key of Object.keys(process.env))if(!Object.hasOwn(savedEnv,key))delete process.env[key]
 Object.assign(process.env,savedEnv)
 await rm(temporary,{recursive:true,force:true})
}
