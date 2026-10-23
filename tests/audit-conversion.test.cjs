const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('js/audit-conversion.js', 'utf8');
const id = '01234567-0123-4123-8123-012345678901';
function browser(optout, saved = new Map()) {
  const calls = [], requests = [];
  const context = { window: { oaiq: (...args) => calls.push(args) }, location: { hostname: 'www.n8ivpromotions.com' },
    localStorage: { getItem: () => optout }, sessionStorage: { getItem: k => saved.get(k), setItem: (k,v) => saved.set(k,v) },
    crypto: { randomUUID: () => id }, fetch: (...args) => { requests.push(args); return Promise.resolve({ok:true}); } };
  vm.runInNewContext(source, context);
  return { run: context.window.N8iVAuditConversion, calls, requests, saved };
}
test('completion shares event ID and does not repeat after reload', () => {
  const b = browser(null); b.run(Array(15).fill(2)); b.run(Array(15).fill(2));
  assert.equal(b.calls.length, 1); assert.equal(b.requests.length, 1);
  assert.equal(b.calls[0][3].event_id, JSON.parse(b.requests[0][1].body).id);
  assert.equal(b.calls[0][3].custom_event_name, 'self_audit_completed');
  const reload = browser(null,b.saved); reload.run(Array(15).fill(2)); assert.equal(reload.calls.length,0);
});
test('opt-out and incomplete answers produce no requests', () => {
  for (const [optout, answers] of [['1',Array(15).fill(2)],[null,[1,2]]]) {
    const b=browser(optout); b.run(answers); assert.equal(b.calls.length,0); assert.equal(b.requests.length,0);
  }
});
test('server validates completion and forwards only minimal fixed event', async () => {
  const handler = require('../api/audit-completed');
  const oldFetch=global.fetch, oldKey=process.env.OPENAI_CONVERSIONS_API_KEY, oldEnv=process.env.VERCEL_ENV;
  process.env.OPENAI_CONVERSIONS_API_KEY='test-only'; process.env.VERCEL_ENV='production';
  const requests=[]; global.fetch=async (...args)=>{requests.push(args);return {ok:true};};
  const run=async (body, origin='https://www.n8ivpromotions.com')=>{
    const res={setHeader(){},status(n){this.code=n;return this;},json(v){this.value=v;return this;}};
    await handler({method:'POST',headers:{origin,'content-type':'application/json','x-forwarded-for':'192.0.2.41',cookie:'__oppref=ref-test; __obref=browser-test; unrelated=ignored'},body},res);return res;
  };
  try {
    const body={id,timestamp:Date.now(),answers:Array(15).fill(2),measurementAllowed:true};
    assert.equal((await run({...body,answers:[]})).code,400);
    assert.equal((await run(body,'https://evil.example')).code,403);
    assert.equal((await run({...body,measurementAllowed:false})).code,400);
    assert.equal((await run(body)).code,200);
    assert.equal(requests.length,1);
    const event=JSON.parse(requests[0][1].body).events[0];
    assert.equal(event.id,id);assert.equal(event.custom_event_name,'self_audit_completed');
    assert.equal(event.answers,undefined);assert.deepEqual(event.user,{obref:'browser-test'});assert.equal(event.oppref,'ref-test');
  } finally {
    global.fetch=oldFetch;
    if(oldKey===undefined)delete process.env.OPENAI_CONVERSIONS_API_KEY;else process.env.OPENAI_CONVERSIONS_API_KEY=oldKey;
    if(oldEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=oldEnv;
  }
});
test('preview deployments never forward conversions, upstream failure stays generic', async () => {
  const handler=require('../api/audit-completed');
  const oldFetch=global.fetch, oldEnv=process.env.VERCEL_ENV, oldKey=process.env.OPENAI_CONVERSIONS_API_KEY;
  let calls=0;
  global.fetch=async()=>{calls++;throw new Error('private upstream detail');};
  process.env.OPENAI_CONVERSIONS_API_KEY='test-only';
  const req={method:'POST',headers:{origin:'https://www.n8ivpromotions.com','content-type':'application/json','x-forwarded-for':'192.0.2.42'},body:{id,timestamp:Date.now(),answers:Array(15).fill(1),measurementAllowed:true}};
  const run=async()=>{const res={setHeader(){},status(n){this.code=n;return this;},json(v){this.value=v;return this;}};await handler(req,res);return res;};
  try {
    process.env.VERCEL_ENV='preview';assert.equal((await run()).code,503);assert.equal(calls,0);
    process.env.VERCEL_ENV='production';const res=await run();assert.equal(res.code,502);assert.deepEqual(res.value,{ok:false});
  } finally {
    global.fetch=oldFetch;
    if(oldEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=oldEnv;
    if(oldKey===undefined)delete process.env.OPENAI_CONVERSIONS_API_KEY;else process.env.OPENAI_CONVERSIONS_API_KEY=oldKey;
  }
});
