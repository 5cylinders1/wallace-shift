import assert from 'node:assert/strict'
import { after, afterEach, test } from 'node:test'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-subscription-test-'))
const compiled = new Map()
async function compile(relative) {
  if (compiled.has(relative)) return compiled.get(relative)
  const target = join(temporary, `${relative}.mjs`); compiled.set(relative, target)
  let source = ts.transpileModule(await readFile(join(root, relative), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
  for (const match of [...source.matchAll(/(from\s+)(['"])(\.[^'"]+)\2/g)]) {
    const path = await compile(join(dirname(relative), match[3].replace(/\.js$/, '.ts')))
    source = source.replace(match[0], `from ${JSON.stringify(pathToFileURL(path).href)}`)
  }
  await mkdir(dirname(target), { recursive: true }); await writeFile(target, source); return target
}
const load = async file => import(pathToFileURL(await compile(file)).href)
const { addCalendarMonths, subscriptionPreview, subscriptionView } = await load('src/client-portal/ai-subscription.ts')
const { changeAiSubscription, generateSubscriptionInvoice, assertSubscriptionCharge, applySubscriptionPayment, subscriptionEntitlement, serviceGatewayAction, requireServiceGateway } = await load('api/_lib/ai-subscription.ts')
const { generateDueInvoices, changeLedger } = await load('api/_lib/portal-ledger.ts')
const { purchasePhoneCredit } = await load('api/_lib/ai-subscription-topup.ts')
const { processPhoneCreditRefunds, reservePhoneCreditRefunds, phoneCreditServiceEnded } = await load('api/_lib/ai-subscription-refund.ts')
const { charge, resetFailedPayment, reconcileIntent } = await load('api/_lib/portal-stripe.ts')
const { firstUnsettledInvoice, automaticInvoice } = await load('src/client-portal/model.ts')
const realDate = globalThis.Date
const savedFetch = globalThis.fetch
const savedEnv = { ...process.env }
const savedSecret = process.env.AI_SERVICE_GATEWAY_SECRET
const actor = { email: 'client@example.test', admin: false }
function now(date, hour = 15) {
  const instant = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`)
  globalThis.Date = class extends realDate { constructor(...args) { super(...(args.length ? args : [instant])) } static now() { return instant } }
}
function fixture(plan = 'monthly') {
  process.env.AI_SERVICE_GATEWAY_SECRET = 'x'.repeat(40)
  return { id: 'subscription-test', revision: 1, createdAt: '2030-01-31T12:00:00Z', client: 'Sample business', email: actor.email,
    title: 'AI service', scope: 'Sample', exclusions: 'Sample', delivery: 'Sample', amount: {monthly:75000,six_months:405000,yearly:720000}[plan], cadence:plan,
    firstDue:'',endDate:'',state:'issued',agreement:'Immutable initial agreement',agreementHash:'signed-hash',signature:{name:'Test Client',email:actor.email,at:'2030-01-31T12:00:00Z',hash:'signed-hash',consent:'agreed'},
    stripeCustomer:'cus_test',paymentMethod:'pm_test',invoices:[],audit:[],aiSubscription:{version:1,plan,createdAt:'2030-01-31T12:00:00Z',changes:[],usage:[],readiness:{chatbot:true,phone:true,at:'2030-01-31T12:00:00Z',reference:'verified-test-gateway'}} }
}
function start(e, date='2030-01-31') { now(date, 12); changeAiSubscription([e], {action:'subscription-start',id:e.id,consent:true,...subscriptionPreview(e.aiSubscription,date)},actor,date) }
function pay(e, date=e.aiSubscription.nextDue) { now(date); assert.equal(generateSubscriptionInvoice(e,date),1);const invoice=e.invoices.at(-1);assertSubscriptionCharge(e,invoice,date,true);invoice.status='paid';applySubscriptionPayment(e,invoice);return invoice }
afterEach(()=>{globalThis.Date=realDate;globalThis.fetch=savedFetch;for(const key of Object.keys(process.env))if(!Object.hasOwn(savedEnv,key))delete process.env[key];Object.assign(process.env,savedEnv); if(savedSecret===undefined)delete process.env.AI_SERVICE_GATEWAY_SECRET;else process.env.AI_SERVICE_GATEWAY_SECRET=savedSecret})
after(async()=>{await rm(temporary,{recursive:true,force:true})})

test('calendar arithmetic preserves anchors across short months and leap years',()=>{
 assert.equal(addCalendarMonths('2030-01-31',1),'2030-02-28')
 assert.equal(addCalendarMonths('2030-02-28',1,'2030-01-31'),'2030-03-31')
 assert.equal(addCalendarMonths('2030-08-31',6),'2031-02-28')
 assert.equal(addCalendarMonths('2028-02-29',12),'2029-02-28')
 assert.equal(addCalendarMonths('2031-02-28',12,'2028-02-29'),'2032-02-29')
})
test('trial starts only after readiness, signed agreement, saved card, and exact dated consent',()=>{
 const e=fixture();now('2030-01-31',12);const body={action:'subscription-start',id:e.id,consent:true,...subscriptionPreview(e.aiSubscription,'2030-01-31')}
 delete process.env.AI_SERVICE_GATEWAY_SECRET;assert.throws(()=>changeAiSubscription([e],body,actor,'2030-01-31'),/service_setup_pending/)
 process.env.AI_SERVICE_GATEWAY_SECRET='x'.repeat(40);e.aiSubscription.readiness.phone=false;assert.throws(()=>changeAiSubscription([e],body,actor,'2030-01-31'),/service_setup_pending/)
 e.aiSubscription.readiness.phone=true;assert.throws(()=>changeAiSubscription([e],{...body,total:1},actor,'2030-01-31'),/subscription_preview_changed/)
 assert.throws(()=>changeAiSubscription([e],body,{...actor,admin:true},'2030-01-31'),/client_authorization_required/)
 start(e);assert.equal(e.firstDue,'2030-02-28');assert.equal(e.invoices.length,0);assert.equal(e.aiSubscription.billingAnchor,'2030-02-28');assert.equal(e.agreement,'Immutable initial agreement')
 assert.equal(generateDueInvoices([e],'2030-02-27'),0)
})
test('all plans invoice exact prepaid amount and extend access only after payment',()=>{
 for(const [plan,amount,end] of [['monthly',75000,'2030-03-28'],['six_months',405000,'2030-08-28'],['yearly',720000,'2031-02-28']]){
  const e=fixture(plan);start(e);now('2030-02-28');assert.equal(generateDueInvoices([e],'2030-02-28'),1)
  const invoice=e.invoices[0];assert.equal(invoice.amount,amount);assert.equal(invoice.subscriptionPeriod.end,end);assert.equal(e.aiSubscription.paidUntil,undefined);assert.equal(subscriptionEntitlement(e,'2030-02-28').allowed,false)
  assert.equal(generateDueInvoices([e],'2030-02-28'),0);invoice.status='paid';applySubscriptionPayment(e,invoice);applySubscriptionPayment(e,invoice)
  assert.equal(e.aiSubscription.paidUntil,end);assert.equal(e.aiSubscription.nextDue,end);assert.equal(subscriptionEntitlement(e,'2030-02-28').allowed,true)
 }
})
test('trial cancellation voids future charges and retains remaining free service only',()=>{
 const e=fixture();start(e);changeAiSubscription([e],{action:'cancel',id:e.id},actor,'2030-02-01')
 assert.equal(e.autopay.enabled,false);assert.equal(generateDueInvoices([e],'2030-02-28'),0)
 assert.equal(subscriptionEntitlement(e,'2030-02-27').allowed,true);assert.equal(subscriptionEntitlement(e,'2030-02-28').allowed,false)
 assert.throws(()=>changeAiSubscription([e],{action:'subscription-start',id:e.id,consent:true,...subscriptionPreview(e.aiSubscription,'2030-02-01')},actor,'2030-02-01'),/subscription_canceled/)
 assert.throws(()=>assertSubscriptionCharge(e,{amount:75000,due:'2030-02-28',subscriptionPeriod:{start:'2030-02-28',end:'2030-03-28',plan:'monthly'}},'2030-02-28',true),/payment_not_ready/)
})
test('canceling prepaid annual service retains six more months and clears queued changes',()=>{
 const e=fixture('yearly');start(e);pay(e);now('2030-08-28')
 changeAiSubscription([e],{action:'subscription-change-plan',id:e.id,plan:'monthly',consent:true,effectiveDate:'2031-02-28',total:75000},actor,'2030-08-28')
 changeAiSubscription([e],{action:'cancel',id:e.id},actor,'2030-08-28')
 assert.equal(e.aiSubscription.pendingPlan,undefined);assert.equal(subscriptionEntitlement(e,'2031-02-27').allowed,true);assert.equal(subscriptionEntitlement(e,'2031-02-28').allowed,false);assert.equal(generateDueInvoices([e],'2031-02-28'),0)
})
test('interval change waits until renewal, can be revised or withdrawn, and freezes old invoices',()=>{
 const e=fixture();start(e);const first=pay(e);const original=JSON.stringify(first);const agreement=e.agreement
 e.invoices.push({id:'abandoned-topup',due:'2030-03-01',amount:4000,fee:0,status:'open',subscriptionCredit:{phoneSeconds:6000}})
 const body={action:'subscription-change-plan',id:e.id,plan:'six_months',consent:true,effectiveDate:'2030-03-28',total:405000}
 changeAiSubscription([e],body,actor,'2030-03-01');assert.equal(e.aiSubscription.plan,'monthly')
 changeAiSubscription([e],{action:'subscription-withdraw-change',id:e.id},actor,'2030-03-01');assert.equal(e.aiSubscription.pendingPlan,undefined)
 changeAiSubscription([e],body,actor,'2030-03-01')
 changeAiSubscription([e],{action:'subscription-authorize',id:e.id,consent:true,nextChargeDate:'2030-03-28',total:405000},actor,'2030-03-01');assert.equal(generateDueInvoices([e],'2030-03-27'),0)
 assert.equal(generateDueInvoices([e],'2030-03-28'),1);const next=e.invoices.at(-1)
 assert.equal(next.amount,405000);assert.equal(next.subscriptionPeriod.end,'2030-09-28');assert.equal(firstUnsettledInvoice(e,true).id,next.id)
 assert.equal(e.amount,405000);assert.equal(e.cadence,'six_months');assert.equal(JSON.stringify(first),original);assert.equal(e.agreement,agreement)
})
test('new card reauthorization binds the actual pending interval and next date',()=>{
 const e=fixture();start(e);pay(e);changeAiSubscription([e],{action:'subscription-change-plan',id:e.id,plan:'yearly',consent:true,effectiveDate:'2030-03-28',total:720000},actor,'2030-03-01');e.autopay=undefined
 assert.throws(()=>changeAiSubscription([e],{action:'subscription-authorize',id:e.id,consent:true,nextChargeDate:'2030-03-28',total:75000},actor,'2030-03-01'),/subscription_preview_changed/)
 changeAiSubscription([e],{action:'subscription-authorize',id:e.id,consent:true,nextChargeDate:'2030-03-28',total:720000},actor,'2030-03-01')
 assert.match(e.autopay.consent,/7200\.00 USD beginning 2030-03-28/);assert.match(e.autopay.consent,/every 12 calendar/)
})
test('withdrawing a lower pending price never revives an unauthorized higher renewal',()=>{
 for(const withdrawal of ['subscription-withdraw-change','subscription-change-plan']){
  const e=fixture('yearly');start(e);pay(e)
  changeAiSubscription([e],{action:'subscription-change-plan',id:e.id,plan:'monthly',consent:true,effectiveDate:'2031-02-28',total:75000},actor,'2030-03-01')
  e.autopay=undefined;e.aiSubscription.renewalAuthorized=false
  changeAiSubscription([e],{action:'subscription-authorize',id:e.id,consent:true,nextChargeDate:'2031-02-28',total:75000},actor,'2030-03-01')
  changeAiSubscription([e],{action:withdrawal,id:e.id,plan:'yearly',consent:true,effectiveDate:'2031-02-28',total:720000},actor,'2030-03-01')
  assert.equal(e.aiSubscription.pendingPlan,undefined);assert.equal(e.autopay.enabled,false);assert.equal(e.aiSubscription.renewalAuthorized,false)
  assert.equal(generateDueInvoices([e],'2031-02-28'),0)
  assert.throws(()=>changeAiSubscription([e],{action:'subscription-authorize',id:e.id,consent:true,nextChargeDate:'2031-02-28',total:75000},actor,'2030-03-01'),/subscription_preview_changed/)
  changeAiSubscription([e],{action:'subscription-authorize',id:e.id,consent:true,nextChargeDate:'2031-02-28',total:720000},actor,'2030-03-01')
  assert.equal(generateDueInvoices([e],'2031-02-28'),1);assert.equal(e.invoices.at(-1).amount,720000)
 }
})
test('failed and delayed payments cannot shift the anchor or collect an elapsed service period',()=>{
 const e=fixture();start(e);now('2030-02-28');generateDueInvoices([e],'2030-02-28');const invoice=e.invoices[0];invoice.status='processing'
 assert.equal(generateDueInvoices([e],'2030-03-05'),0);assert.equal(subscriptionEntitlement(e,'2030-03-05').allowed,false);assert.equal(e.aiSubscription.nextDue,'2030-02-28')
 assertSubscriptionCharge(e,invoice,'2030-03-05',true);invoice.status='paid';applySubscriptionPayment(e,invoice);assert.equal(e.aiSubscription.paidUntil,'2030-03-28');assert.equal(e.aiSubscription.billingAnchor,'2030-02-28')
 assert.throws(()=>assertSubscriptionCharge(e,invoice,'2030-03-28',true),/payment_not_ready/)
 const unpaid=fixture();start(unpaid);assert.equal(subscriptionView(unpaid.aiSubscription,'2030-03-27').recoveryRequired,false);assert.equal(subscriptionView(unpaid.aiSubscription,'2030-03-28').recoveryRequired,true)
})
test('gateway auth fails closed and service expiry is enforced independently of cron',()=>{
 const e=fixture();start(e);assert.throws(()=>requireServiceGateway('Bearer wrong'),/forbidden/);requireServiceGateway(`Bearer ${'x'.repeat(40)}`)
 assert.equal(subscriptionEntitlement(e,'2030-02-27').allowed,true);now('2030-02-28');assert.equal(subscriptionEntitlement(e,'2030-02-28').allowed,false)
 e.state='complete';assert.equal(subscriptionEntitlement(e,'2030-02-01').allowed,false);e.state='issued';e.archivedAt='2030-02-01';assert.equal(subscriptionEntitlement(e,'2030-02-01').allowed,false)
})
test('chat quota is atomic, refunds failed replies, and deduplicates across monthly resets',()=>{
 const e=fixture('yearly');start(e);pay(e);const consume={id:e.id,action:'consume',kind:'chat',eventId:'reply_1',units:1}
 assert.equal(serviceGatewayAction([e],consume,'2030-03-01').allowed,true);assert.equal(serviceGatewayAction([e],consume,'2030-04-01').duplicate,true)
 assert.equal(e.aiSubscription.usage.reduce((sum,p)=>sum+p.chatReplies,0),1)
 serviceGatewayAction([e],{id:e.id,action:'refund-chat',eventId:'reply_1'},'2030-04-01');serviceGatewayAction([e],{id:e.id,action:'refund-chat',eventId:'reply_1'},'2030-04-01')
 assert.equal(e.aiSubscription.usage.reduce((sum,p)=>sum+p.chatReplies,0),0)
 assert.equal(serviceGatewayAction([e],{...consume,eventId:'too_many',units:2001},'2030-04-01').allowed,false)
})
test('phone reservations prevent concurrent overspend and refund actual duration to original period',()=>{
 const e=fixture('yearly');start(e);pay(e);now('2030-03-01');e.aiSubscription.usage=[{periodStart:'2030-02-28',phoneSeconds:29900,chatReplies:0,events:[]}];e.aiSubscription.phoneCreditSeconds=50
 const reserved=serviceGatewayAction([e],{id:e.id,action:'reserve-phone',eventId:'call_1',requestedSeconds:900},'2030-03-01');assert.equal(reserved.grantedSeconds,150)
 const blocked=serviceGatewayAction([e],{id:e.id,action:'reserve-phone',eventId:'call_2',requestedSeconds:10},'2030-03-01');assert.equal(blocked.allowed,false)
 const duplicate=serviceGatewayAction([e],{id:e.id,action:'reserve-phone',eventId:'call_1',requestedSeconds:900},'2030-03-01');assert.equal(duplicate.duplicate,true)
 serviceGatewayAction([e],{id:e.id,action:'finalize-phone',eventId:'call_1',usedSeconds:80},'2030-04-01')
 assert.equal(e.aiSubscription.usage[0].phoneSeconds,29980);assert.equal(e.aiSubscription.phoneCreditSeconds,50)
 assert.equal(serviceGatewayAction([e],{id:e.id,action:'finalize-phone',eventId:'call_1',usedSeconds:80},'2030-04-01').duplicate,true)
 assert.throws(()=>serviceGatewayAction([e],{id:e.id,action:'finalize-phone',eventId:'call_1',usedSeconds:81},'2030-04-01'),/usage_event_conflict/)
})
test('phone gateway enforces the advertised per-call cap independently of the provider request',()=>{
 const e=fixture();start(e);pay(e);now('2030-03-01')
 const grant=serviceGatewayAction([e],{id:e.id,action:'reserve-phone',eventId:'overlong_call',requestedSeconds:14400})
 assert.equal(grant.grantedSeconds,900);assert.equal(grant.expiresAt,'2030-03-01T15:15:00.000Z')
 const usage=e.aiSubscription.usage[0].phoneSeconds
 assert.equal(serviceGatewayAction([e],{id:e.id,action:'consume',kind:'phone',eventId:'overlong_usage',units:901}).allowed,false)
 assert.equal(e.aiSubscription.usage[0].phoneSeconds,usage)
})
test('prepaid credit is applied once, never extends service, and cannot be bought during trial',()=>{
 const e=fixture();start(e);const credit={id:'credit',due:'2030-02-01',amount:4000,fee:0,status:'open',subscriptionCredit:{phoneSeconds:6000}}
 assert.throws(()=>assertSubscriptionCharge(e,credit,'2030-02-01',false),/payment_not_ready/)
 pay(e);const paidUntil=e.aiSubscription.paidUntil;assertSubscriptionCharge(e,credit,'2030-03-01',false);assert.throws(()=>assertSubscriptionCharge(e,credit,'2030-03-01',true),/payment_not_ready/)
 credit.status='paid';applySubscriptionPayment(e,credit);applySubscriptionPayment(e,credit);assert.equal(e.aiSubscription.phoneCreditSeconds,6000);assert.equal(e.aiSubscription.paidUntil,paidUntil)
 now(paidUntil);assert.equal(subscriptionEntitlement(e,paidUntil).prepaidPhoneSecondsRemaining,0)
})
test('issuing subscription agreement creates no invoice; legacy cancellation remains unchanged',()=>{
 const e=fixture();e.state='draft';changeLedger([e],{action:'issue',id:e.id},{email:'owner@example.test',admin:true});assert.equal(e.invoices.length,0)
 delete e.aiSubscription;e.cadence='monthly';e.nextDue='2030-03-01';changeLedger([e],{action:'cancel',id:e.id},actor);assert.equal(e.state,'canceled');assert.equal(e.nextDue,undefined)
})

function paymentStore(e, afterReservation) {
 Object.assign(process.env,{VERCEL_ENV:'development',DEMO_AUDIT_REDIS_URL:'https://redis.example.test',DEMO_AUDIT_REDIS_TOKEN:'fake',STRIPE_SECRET_KEY:'sk_test_fake',STRIPE_PUBLISHABLE_KEY:'pk_test_fake',STRIPE_WEBHOOK_SECRET:'whsec_fake'})
 const values=new Map([['portal:engagements',JSON.stringify([e])]]),intents=new Map(),keys=new Map(),refunds=new Map();let created=0,status='succeeded',refundCreated=0,refundStatus='succeeded',refundLost=false
 globalThis.fetch=async(url,init)=>{
  if(String(url).startsWith('https://redis.example.test')){
   const command=JSON.parse(init.body),[verb,key,value]=command
   if(verb==='GET')return Response.json({result:values.get(key)??null})
   if(verb==='SET'){values.set(key,value);return Response.json({result:'OK'})}
   if(verb==='EVAL'){const [,,,ledgerKey,before,next]=command;if((values.get(ledgerKey)??'[]')!==before)return Response.json({result:0});values.set(ledgerKey,next);if(afterReservation&&JSON.parse(next).some(entry=>entry.invoices.some(invoice=>invoice.status==='processing'&&invoice.attempt&&!invoice.paymentIntent))){const records=JSON.parse(values.get(ledgerKey));afterReservation(records);values.set(ledgerKey,JSON.stringify(records));afterReservation=undefined}return Response.json({result:1})}
  }
  if(String(url).startsWith('https://api.stripe.com/v1/')){
   const path=String(url).split('/v1/')[1]
   if(path==='payment_methods/pm_test')return Response.json({id:'pm_test',customer:'cus_test',type:'card',card:{funding:'credit',brand:'visa',last4:'4242'}})
   if(path==='payment_intents'){
    const key=init.headers['Idempotency-Key'];if(keys.has(key))return Response.json(intents.get(keys.get(key)))
    const p=new URLSearchParams(init.body);const id=`pi_test${++created}`
    const intent={id,status,amount:Number(p.get('amount')),currency:'usd',customer:'cus_test',metadata:{engagement:p.get('metadata[engagement]'),invoice:p.get('metadata[invoice]'),attempt:p.get('metadata[attempt]')}}
    keys.set(key,id);intents.set(id,intent);return Response.json(intent)
   }
   if(path.startsWith('payment_intents/')){const id=path.split('/')[1].split('?')[0];const intent=intents.get(id);if(path.endsWith('/cancel'))intent.status='canceled';return Response.json(intent)}
   if(path==='refunds'){
    const key=init.headers['Idempotency-Key'];if(keys.has(key))return Response.json(refunds.get(keys.get(key)))
    const p=new URLSearchParams(init.body),id=`re_test${++refundCreated}`
    const refund={id,status:refundStatus,payment_intent:p.get('payment_intent'),amount:Number(p.get('amount')),currency:'usd',metadata:{credit_refund:p.get('metadata[credit_refund]')}}
    keys.set(key,id);refunds.set(id,refund)
    if(refundLost){refundLost=false;throw new Error('Simulated lost response after successful Stripe creation')}
    return Response.json(refund)
   }
   if(path.startsWith('refunds/'))return Response.json(refunds.get(path.split('/')[1]))
  }
  throw new Error(`Unexpected test network access: ${url}`)
 }
 return {entries:()=>JSON.parse(values.get('portal:engagements')),replace:entries=>values.set('portal:engagements',JSON.stringify(entries)),created:()=>created,intents,status:value=>{status=value},refunds,refundCreated:()=>refundCreated,refundStatus:value=>{refundStatus=value},loseRefundResponse:()=>{refundLost=true}}
}
test('explicit prepaid purchase is idempotent, trial-blocked, and never a recurring charge',async()=>{
 const e=fixture();start(e);let store=paymentStore(e)
 const body={action:'subscription-topup',id:e.id,requestId:'00000000-0000-4000-8000-000000000001',consent:true,total:4000}
 await assert.rejects(()=>purchasePhoneCredit(body,actor,'http://localhost'),/payment_not_ready/);assert.equal(store.created(),0)
 pay(e);store=paymentStore(e)
 assert.equal((await purchasePhoneCredit(body,actor,'http://localhost')).status,'succeeded')
 await purchasePhoneCredit(body,actor,'http://localhost')
 const current=store.entries()[0],credit=current.invoices.find(i=>i.subscriptionCredit)
 assert.equal(store.created(),1);assert.equal(current.aiSubscription.phoneCreditSeconds,6000);assert.equal(automaticInvoice(current,credit),false)
 const intent=[...store.intents.values()][0];await reconcileIntent(intent);await reconcileIntent(intent)
 assert.equal(store.entries()[0].aiSubscription.phoneCreditSeconds,6000)
 assert.equal(store.entries()[0].invoices.filter(i=>i.subscriptionCredit).length,1)
})
test('failed prepaid charge can be reset and retried without granting unpaid or duplicate credit',async()=>{
 const e=fixture();start(e);pay(e);const store=paymentStore(e);store.status('requires_payment_method')
 const body={action:'subscription-topup',id:e.id,requestId:'00000000-0000-4000-8000-000000000002',consent:true,total:4000}
 assert.equal((await purchasePhoneCredit(body,actor,'http://localhost')).status,'requires_payment_method')
 let current=store.entries()[0],credit=current.invoices.find(i=>i.subscriptionCredit)
 assert.equal(current.aiSubscription.phoneCreditSeconds,undefined)
 await resetFailedPayment(current,credit);store.status('succeeded')
 assert.equal((await purchasePhoneCredit(body,actor,'http://localhost')).status,'succeeded')
 await purchasePhoneCredit(body,actor,'http://localhost');current=store.entries()[0]
 assert.equal(store.created(),2);assert.equal(current.aiSubscription.phoneCreditSeconds,6000);assert.equal(current.invoices.filter(i=>i.subscriptionCredit).length,1)
})

test('trial lasts a full calendar month and renewals align with the daily 14:00 UTC run',()=>{
 const e=fixture();now('2030-01-31',18);const preview=subscriptionPreview(e.aiSubscription)
 assert.equal(preview.trialEnd,'2030-03-01');assert.equal(preview.trialEndsAt,'2030-03-01T14:00:00.000Z')
 changeAiSubscription([e],{action:'subscription-start',id:e.id,consent:true,...preview},actor)
 now('2030-03-01',13);assert.equal(subscriptionEntitlement(e).allowed,true);assert.equal(generateSubscriptionInvoice(e,'2030-03-01'),0)
 now('2030-03-01',14);assert.equal(subscriptionView(e.aiSubscription).processingGrace,true);assert.equal(generateSubscriptionInvoice(e,'2030-03-01'),1)
 e.aiSubscription.paymentStatus='requires_payment_method';assert.equal(subscriptionEntitlement(e).allowed,false)
 e.aiSubscription.paymentStatus='processing';assert.equal(subscriptionEntitlement(e).allowed,true)
 now('2030-03-01',15);assert.equal(subscriptionEntitlement(e).allowed,false)
})
test('a trial allowance never resets during free extension to the billing run',()=>{
 const e=fixture();now('2030-01-31',18);changeAiSubscription([e],{action:'subscription-start',id:e.id,consent:true,...subscriptionPreview(e.aiSubscription)},actor)
 serviceGatewayAction([e],{action:'consume',id:e.id,eventId:'trial_reply',kind:'chat',units:500},'2030-02-28')
 now('2030-03-01',13);assert.equal(subscriptionView(e.aiSubscription).usage.chatReplies,500);assert.equal(subscriptionEntitlement(e).chatRepliesRemaining,0)
})
test('manual refunds and disputes freeze prepaid spending while retaining included service',async()=>{
 for(const signal of [{amount_refunded:4000,disputed:false},{amount_refunded:0,disputed:true}]){
  const e=fixture();start(e);pay(e);const store=paymentStore(e)
  const body={action:'subscription-topup',id:e.id,requestId:'00000000-0000-4000-8000-000000000003',consent:true,total:4000}
  await purchasePhoneCredit(body,actor,'http://localhost');const intent=[...store.intents.values()][0]
  await reconcileIntent({...intent,latest_charge:signal});const current=store.entries()[0]
  assert.ok(current.aiSubscription.creditReviewRequired);assert.equal(subscriptionEntitlement(current).prepaidPhoneSecondsRemaining,0);assert.equal(subscriptionEntitlement(current).allowed,true)
  assert.ok(subscriptionEntitlement(current).includedPhoneSecondsRemaining>0)
  await assert.rejects(()=>purchasePhoneCredit({...body,requestId:'00000000-0000-4000-8000-000000000004'},actor,'http://localhost'),/payment_not_ready/)
 }
})
test('tracked expiry refunds do not create a false manual-credit review flag',()=>{
 const e=fixture();start(e);pay(e);const invoice={id:'tracked-refund',amount:4000,due:'2030-03-01',fee:0,status:'paid',refunded:2000,subscriptionCredit:{phoneSeconds:6000,appliedAt:'2030-03-01T00:00:00Z',refunds:[{amount:2000,state:'pending'}]}}
 applySubscriptionPayment(e,invoice);assert.equal(e.aiSubscription.creditReviewRequired,undefined)
})
test('a stale settled invoice cannot reopen grace after a later renewal failure',async()=>{
 const e=fixture();start(e);pay(e);const first=e.invoices[0];first.attempt={id:'first-attempt',startedAt:'2030-02-28T14:00:00Z',method:'pm_test',fee:0,consent:'test',automatic:true,origin:'http://localhost'};first.paymentIntent='pi_oldsettled'
 now('2030-03-28',14);generateSubscriptionInvoice(e,'2030-03-28');e.aiSubscription.paymentStatus='requires_payment_method';const store=paymentStore(e)
 await reconcileIntent({id:'pi_oldsettled',customer:'cus_test',amount:75000,currency:'usd',status:'succeeded',metadata:{engagement:e.id,invoice:first.id,attempt:'first-attempt'}})
 const current=store.entries()[0];assert.equal(current.aiSubscription.paymentStatus,'requires_payment_method');assert.equal(subscriptionEntitlement(current).allowed,false)
})

test('cancellation after reservation but before Stripe submission prevents a new charge',async()=>{
 const e=fixture();start(e);now('2030-02-28');generateSubscriptionInvoice(e,'2030-02-28')
 const store=paymentStore(e,entries=>changeAiSubscription(entries,{action:'cancel',id:e.id},actor))
 await assert.rejects(()=>charge(e,e.invoices[0],'http://localhost',true,0),/payment_not_ready/)
 assert.equal(store.created(),0);assert.equal(store.entries()[0].aiSubscription.canceledAt!==undefined,true)
})

function purchasedCredits(count=1){
 const e=fixture();start(e);pay(e)
 for(let index=0;index<count;index++){
  const invoice={id:`credit-${index}`,due:'2030-03-01',amount:4000,fee:0,status:'paid',paidAt:'2030-03-01T00:00:00Z',paymentIntent:`pi_credit${index}`,subscriptionCredit:{phoneSeconds:6000}}
  e.invoices.push(invoice);applySubscriptionPayment(e,invoice)
 }
 return e
}
function finishService(e){changeAiSubscription([e],{action:'cancel',id:e.id},actor);now(e.aiSubscription.paidUntil)}
test('unused credit refund waits for final service end and ignores a payment pause',()=>{
 const e=purchasedCredits();now('2030-03-28');assert.equal(phoneCreditServiceEnded(e),false);assert.equal(reservePhoneCreditRefunds(e),0)
 now('2030-03-01');changeAiSubscription([e],{action:'cancel',id:e.id},actor);assert.equal(reservePhoneCreditRefunds(e),0)
 now('2030-03-28',13);assert.equal(reservePhoneCreditRefunds(e),0)
 now('2030-03-28',14);assert.equal(reservePhoneCreditRefunds(e),6000);assert.equal(e.aiSubscription.phoneCreditSeconds,0)
 const archived=purchasedCredits();archived.archivedAt=new Date().toISOString();assert.equal(phoneCreditServiceEnded(archived),true)
 const completed=purchasedCredits();completed.state='complete';assert.equal(phoneCreditServiceEnded(completed),true)
})
test('multiple purchases receive only their unused value and bounded replay never refunds twice',async()=>{
 const e=purchasedCredits(2);e.aiSubscription.phoneCreditSeconds=9000;finishService(e);const store=paymentStore(e)
 const first=await processPhoneCreditRefunds({maxAttempts:1});assert.equal(first.reservedSeconds,9000);assert.equal(first.sent,1);assert.equal(store.refundCreated(),1)
 assert.equal(store.entries()[0].aiSubscription.phoneCreditSeconds,0)
 await processPhoneCreditRefunds({maxAttempts:1});await processPhoneCreditRefunds({maxAttempts:10})
 assert.equal(store.refundCreated(),2);assert.deepEqual([...store.refunds.values()].map(r=>r.amount).sort((a,b)=>a-b),[2000,4000])
 assert.ok(store.entries()[0].invoices.filter(i=>i.subscriptionCredit).every(i=>i.subscriptionCredit.refunds.every(r=>r.state==='sent')))
})
test('concurrent refund processors share a single reservation and Stripe idempotency key',async()=>{
 const e=purchasedCredits();finishService(e);const store=paymentStore(e)
 await Promise.all([processPhoneCreditRefunds(),processPhoneCreditRefunds()])
 const current=store.entries()[0];assert.equal(store.refundCreated(),1);assert.equal(current.aiSubscription.phoneCreditSeconds,0)
 assert.equal(current.invoices.at(-1).subscriptionCredit.refunds.length,1)
})
test('late phone settlement returns unused reserved seconds for a later proportional refund',async()=>{
 const e=purchasedCredits();now('2030-03-27');e.aiSubscription.usage=[{periodStart:'2030-02-28',phoneSeconds:30000,chatReplies:0,events:[]}]
 const grant=serviceGatewayAction([e],{id:e.id,action:'reserve-phone',eventId:'late_call',requestedSeconds:900});assert.equal(grant.grantedSeconds,900)
 finishService(e);const store=paymentStore(e);await processPhoneCreditRefunds();assert.equal([...store.refunds.values()][0].amount,3400)
 const entries=store.entries();serviceGatewayAction(entries,{id:e.id,action:'finalize-phone',eventId:'late_call',usedSeconds:100});store.replace(entries)
 assert.equal(store.entries()[0].aiSubscription.phoneCreditSeconds,800);await processPhoneCreditRefunds()
 assert.equal([...store.refunds.values()].reduce((sum,r)=>sum+r.amount,0),3933);assert.equal(store.entries()[0].aiSubscription.phoneCreditSeconds,0)
})
test('cumulative refund rounding carries fractional cents across late settlements',()=>{
 const e=purchasedCredits();finishService(e);e.aiSubscription.phoneCreditSeconds=1;reservePhoneCreditRefunds(e)
 e.aiSubscription.phoneCreditSeconds=2;reservePhoneCreditRefunds(e)
 e.aiSubscription.phoneCreditSeconds=5997;reservePhoneCreditRefunds(e)
 const refunds=e.invoices.at(-1).subscriptionCredit.refunds;assert.deepEqual(refunds.map(r=>r.amount),[1,1,3998]);assert.equal(refunds.reduce((sum,r)=>sum+r.amount,0),4000)
})
test('lost refund response reuses the key; aged unknown results require review without a second payout',async()=>{
 const e=purchasedCredits();finishService(e);let store=paymentStore(e);store.loseRefundResponse()
 assert.equal((await processPhoneCreditRefunds()).pending,1);assert.equal(store.refundCreated(),1)
 assert.equal((await processPhoneCreditRefunds()).sent,1);assert.equal(store.refundCreated(),1)
 const second=purchasedCredits();finishService(second);store=paymentStore(second);store.loseRefundResponse();await processPhoneCreditRefunds()
 now('2030-03-29');assert.equal((await processPhoneCreditRefunds()).review,1);assert.equal(store.refundCreated(),1)
 assert.equal(store.entries()[0].invoices.at(-1).subscriptionCredit.refunds[0].state,'review');assert.equal(store.entries()[0].aiSubscription.phoneCreditSeconds,0)
})
test('pending Stripe refunds are polled by ID, and failed results require review',async()=>{
 const e=purchasedCredits();finishService(e);const store=paymentStore(e);store.refundStatus('pending')
 await processPhoneCreditRefunds();assert.equal(store.entries()[0].invoices.at(-1).subscriptionCredit.refunds[0].state,'pending')
 now('2030-03-30');[...store.refunds.values()][0].status='succeeded';assert.equal((await processPhoneCreditRefunds()).sent,1);assert.equal(store.refundCreated(),1)
 const second=purchasedCredits();finishService(second);const failed=paymentStore(second);failed.refundStatus('failed');assert.equal((await processPhoneCreditRefunds()).review,1)
 await processPhoneCreditRefunds();assert.equal(failed.refundCreated(),1);assert.equal(failed.entries()[0].aiSubscription.phoneCreditSeconds,0)
})
test('known manual credit refunds or disputes prevent automatic expiry refunds',async()=>{
 const e=purchasedCredits();finishService(e);e.invoices.at(-1).refunded=100;const store=paymentStore(e)
 await processPhoneCreditRefunds();assert.equal(store.refundCreated(),0);assert.equal(store.entries()[0].aiSubscription.creditReviewRequired.reason,'untracked_refund')
})
test('a pending Stripe refund does not starve a later refund on the next bounded run',async()=>{
 const e=purchasedCredits(2);finishService(e);const store=paymentStore(e);store.refundStatus('pending')
 assert.equal((await processPhoneCreditRefunds({maxAttempts:1})).pending,1);assert.equal(store.refundCreated(),1)
 store.refundStatus('succeeded');assert.equal((await processPhoneCreditRefunds({maxAttempts:1})).sent,1);assert.equal(store.refundCreated(),2)
 const refunds=store.entries()[0].invoices.flatMap(i=>i.subscriptionCredit?.refunds??[])
 assert.equal(refunds.filter(r=>r.state==='pending').length,1);assert.equal(refunds.filter(r=>r.state==='sent').length,1)
 assert.ok(refunds.every(r=>r.checkedAt))
})
test('archived service accepts late usage settlement without permitting new work',async()=>{
 const e=purchasedCredits();now('2030-03-01');e.aiSubscription.usage=[{periodStart:'2030-02-28',phoneSeconds:30000,chatReplies:0,events:[]}]
 serviceGatewayAction([e],{id:e.id,action:'reserve-phone',eventId:'archived_call',requestedSeconds:900})
 serviceGatewayAction([e],{id:e.id,action:'consume',kind:'chat',eventId:'archived_reply',units:1})
 e.archivedAt=new Date().toISOString();const store=paymentStore(e);await processPhoneCreditRefunds()
 const entries=store.entries(),current=entries[0]
 for(const body of [{action:'readiness',chatbot:true,phone:true,reference:'late'},{action:'reserve-phone',eventId:'new_call',requestedSeconds:1},{action:'consume',kind:'chat',eventId:'new_reply',units:1}])assert.throws(()=>serviceGatewayAction(entries,{id:e.id,...body}),/agreement_archived/)
 serviceGatewayAction(entries,{id:e.id,action:'finalize-phone',eventId:'archived_call',usedSeconds:100})
 serviceGatewayAction(entries,{id:e.id,action:'refund-chat',eventId:'archived_reply'})
 assert.equal(current.aiSubscription.phoneCreditSeconds,800);assert.equal(current.aiSubscription.usage[0].chatReplies,0)
 assert.equal(subscriptionEntitlement(current).allowed,false);store.replace(entries);await processPhoneCreditRefunds()
 assert.equal([...store.refunds.values()].reduce((sum,r)=>sum+r.amount,0),3933);assert.equal(store.entries()[0].aiSubscription.phoneCreditSeconds,0)
})
test('owner archive or completion cannot cut short free, prepaid, or processing-grace service',()=>{
 const owner={email:'owner@example.test',admin:true}
 for(const action of ['archive','complete']){
  const e=fixture('yearly');start(e)
  assert.throws(()=>changeLedger([e],{action,id:e.id},owner),/subscription_service_active/)
  pay(e);now('2030-08-28');assert.throws(()=>changeLedger([e],{action,id:e.id},owner),/subscription_service_active/)
  now('2031-02-28',14);assert.throws(()=>changeLedger([e],{action,id:e.id},owner),/subscription_service_active/)
  now('2031-02-28',15);changeLedger([e],{action,id:e.id},owner)
  assert.equal(e.autopay.enabled,false);assert.equal(e.aiSubscription.renewalAuthorized,false)
  if(action==='archive'){
   e.aiSubscription.renewalAuthorized=true // A record saved by an older version.
   changeLedger([e],{action:'restore',id:e.id},owner)
   assert.equal(e.aiSubscription.renewalAuthorized,false);assert.equal(e.autopay.enabled,false)
  }
 }
})
