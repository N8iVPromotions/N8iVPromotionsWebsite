const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const score = require('../js/audit-scoring');
const apiScore = require('../api/self-audit').scoreAudit;
function fixture({ failEmail = false, answers = Array(15).fill(2), blockedStorage = false } = {}) {
  const nodes = new Map();
  const node = key => { if (!nodes.has(key)) nodes.set(key, { textContent: '', style: {}, classList: { add(){}, remove(){} }, querySelector: selector => node(`${key} ${selector}`) }); return nodes.get(key); };
  const panels = Array.from({length:5}, (_,i) => ({ classList: { add(){}, remove(){} }, querySelector: selector => node(`panel${i} ${selector}`), querySelectorAll: () => answers.slice(i*3,i*3+3).map(a => ({ querySelector: () => Number.isInteger(a) ? {} : null, scrollIntoView(){} })) }));
  const fields = new Map(answers.flatMap((a,i) => Number.isInteger(a) ? [[`q${i}`, String(a)]] : []));
  const events = {}; let start; let requests = 0; let leads = 0;
  const storage = new Map();
  const form = { action:'/api/self-audit', hidden:true, querySelector: node, querySelectorAll: () => panels, addEventListener: (name,fn) => events[name] = fn, reportValidity: () => true, elements:{namedItem:()=>null} };
  const window = { N8iVAuditScore:score, scrollTo(){}, fbq(){leads++}, N8iVAttribution:{track(){}} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/self-audit.js'),'utf8'), {window,document:{querySelector:s=>s==='[data-self-audit-form]'?form:s==='[data-start-audit]'?{addEventListener:(_,fn)=>start=fn}:node(s)},FormData:class { entries(){return fields.entries()} has(k){return fields.has(k)} get(k){return fields.get(k)} },sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>{if(blockedStorage)throw Error('blocked');storage.set(k,v)}},location:{search:''},URLSearchParams,matchMedia:()=>({matches:true}),fetch:async()=>{requests++;if(failEmail)throw Error('Offline');return {ok:true,json:async()=>({ok:true,emailDelivered:true})}}});
  return {nodes,fields,storage,start,click:()=>events.click({target:{closest:s=>s==='[data-next]'?{}:null}}),submit:()=>events.submit({preventDefault(){}}),requests:()=>requests,leads:()=>leads};
}
test('shared scoring covers bands and rejects incomplete/invalid answers',()=>{
  assert.equal(score,apiScore);
  for(const [answer,expected] of [[0,0],[1,33],[2,67],[3,100]]) assert.equal(score(Array(15).fill(answer)).score,expected);
  for(const total of [16,27,36]) { const a=Array(15).fill(0); for(let n=0;n<total;n++) a[Math.floor(n/3)]++; assert.equal(score(a).score,Math.round(total/45*100)); }
  assert.throws(()=>score(Array(14).fill(3)));assert.throws(()=>score([...Array(14).fill(3),NaN]));assert.throws(()=>score([...Array(14).fill(3),4]));
});
test('15 answers show score without contact, requests, or Lead; handoff contains no personal details',()=>{
 const f=fixture();f.start();for(let i=0;i<5;i++)f.click();assert.equal(f.nodes.get('[data-result-panel] [data-score]').textContent,67);assert.equal(f.requests(),0);assert.equal(f.leads(),0);const handoff=JSON.parse(f.storage.get('n8iv_fit_review_draft'));assert.equal(handoff.email,'');assert.match(handoff.challenge,/67\/100/);
});
test('missing answer prevents result',()=>{const f=fixture({answers:[undefined,...Array(14).fill(2)]});f.start();f.click();assert.match(f.nodes.get('panel0 [data-step-error]').textContent,/Choose/);assert.equal(f.storage.has('n8iv_self_audit_result'),false)});
test('email failure preserves already visible result and no conversion',async()=>{const f=fixture({failEmail:true});f.start();for(let i=0;i<5;i++)f.click();f.fields.set('name','Test');f.fields.set('email','test@example.invalid');f.fields.set('company','Test');await f.submit();assert.equal(f.requests(),1);assert.equal(f.nodes.get('[data-result-panel] [data-score]').textContent,67);assert.match(f.nodes.get('[data-audit-error]').textContent,/still available/);assert.equal(f.leads(),0)});
test('email success accurately says provider accepted, separates Fit Review and consent',async()=>{const f=fixture();f.start();for(let i=0;i<5;i++)f.click();await f.submit();assert.match(f.nodes.get('[data-result-panel] [data-followup-message]').textContent,/inbox delivery is not confirmed/);assert.match(f.nodes.get('[data-result-panel] [data-followup-message]').textContent,/did not opt in/);assert.equal(f.leads(),0)});
test('score still works if session storage unavailable',()=>{const f=fixture({blockedStorage:true});f.start();for(let i=0;i<5;i++)f.click();assert.equal(f.nodes.get('[data-result-panel] [data-score]').textContent,67)});
