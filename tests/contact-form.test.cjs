const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/main.js'), 'utf8');
const formSource = source.slice(source.indexOf('(function initAuditRequestForm()'), source.indexOf('// ── NEWSLETTER'));
function fixture({statusCode=200, result={ok:true}, offline=false, token='verified'}={}) {
 const fields = new Map(Object.entries({firstName:'Jane',email:'jane@example.invalid',company:'QA',challenge:'Score 67/100','cf-turnstile-response':token}));
 const events={}, storage=new Map(), status={}, button={innerHTML:'Send',style:{},setAttribute(){}};
 let resets=0, requests=0, conversions=0, challengeResets=0; const gtagCalls=[];
 const form={action:'/api/audit-request',hidden:false,querySelector:s=>s.includes('submit')?button:s==='.cf-turnstile'?{}:null,elements:{namedItem:()=>null},setAttribute(){},addEventListener:(n,f)=>events[n]=f,reportValidity:()=>true,reset(){resets++;fields.clear()}};
 const done={hidden:true,querySelector:()=>({focus(){}})};
 vm.runInNewContext(formSource,{document:{querySelector:s=>s==='[data-audit-request-form]'?form:s==='[data-request-done]'?done:null,getElementById:()=>status},window:{turnstile:{reset(){challengeResets++}},gtag:(...args)=>gtagCalls.push(args),N8iVAttribution:{getPayload:()=>({latestTouch:{utm_source:'qa'}}),track(){conversions++}}},FormData:class{entries(){return fields.entries()}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},fetch:async()=>{requests++;if(offline)throw Error('offline');return {ok:statusCode<400,status:statusCode,json:async()=>result}},console:{error(){}}});
 return {fields,storage,status,button,form,done,submit:()=>events.submit({preventDefault(){}}),counts:()=>({resets,requests,conversions,challengeResets}),gtagCalls};
}
test('confirmed request sends one GA4 generate_lead without form data',async()=>{const f=fixture();await f.submit();assert.equal(JSON.stringify(f.gtagCalls),JSON.stringify([['event','generate_lead',{form_id:'contact_request'}]]))});
test('confirmed request clears draft, shows completion, and tracks once',async()=>{const f=fixture();await f.submit();assert.equal(f.done.hidden,false);assert.equal(f.form.hidden,true);assert.equal(f.storage.size,0);assert.deepEqual(f.counts(),{resets:1,requests:1,conversions:1,challengeResets:1});assert.equal(f.button.disabled,false)});
for(const options of [{offline:true},{statusCode:500,result:{error:'Unavailable'}},{statusCode:429,result:{error:'Too many requests'}},{statusCode:400,result:{error:'Please retry verification'}},{result:{}}]) test(`failure preserves form and draft: ${JSON.stringify(options)}`,async()=>{const f=fixture(options);await f.submit();assert.equal(f.fields.get('challenge'),'Score 67/100');assert.ok(f.storage.has('n8iv_fit_review_draft'));assert.equal(f.form.hidden,false);assert.equal(f.counts().conversions,0);assert.equal(f.gtagCalls.length,0);assert.equal(f.counts().resets,0);assert.equal(f.button.disabled,false);assert.match(f.status.textContent,/details are still here/);assert.doesNotMatch(f.status.textContent,/mailto|email.*instead/i)});
test('missing human check blocks requests and offers reload while preserving draft',async()=>{const f=fixture({token:''});await f.submit();await f.submit();assert.equal(f.counts().requests,0);assert.match(f.status.textContent,/reload this page/);assert.ok(f.storage.has('n8iv_fit_review_draft'))});
test('direct email links are limited to booking and legal contact', () => {
  const root = path.join(__dirname, '..');
  const allowed = new Set(['book.html', 'privacy.html', 'terms.html', 'security.html']);
  const email = 'zajen@n8ivpromotions.com';
  for (const directory of ['.', 'blog', 'js']) {
    for (const name of fs.readdirSync(path.join(root, directory))) {
      if (!/\.(?:html|js)$/.test(name)) continue;
      const filename = path.join(directory, name);
      let source = fs.readFileSync(path.join(root, filename), 'utf8');
      if (allowed.has(filename)) {
        source = source.replaceAll('mailto:' + email, '').replaceAll(email, '');
      }
      assert.doesNotMatch(source, /mailto:|tel:|zajen@n8ivpromotions\.com|480.{0,8}269.{0,8}3185/i, filename);
    }
  }
  const book = fs.readFileSync(path.join(root, 'book.html'), 'utf8');
  assert.match(book, /mailto:zajen@n8ivpromotions\.com\?subject=Agency%20Fit%20Review%20request/i);
});

test('general inquiries have an optional editable message field',()=>{const html=fs.readFileSync(path.join(__dirname,'../contact.html'),'utf8');assert.match(html,/<textarea id="challenge" name="challenge" rows="4" maxlength="3000"/);assert.doesNotMatch(html,/<input type="hidden" name="challenge"/);assert.doesNotMatch(html,/<textarea[^>]*required/);assert.match(html,/data-submit-label="Send request"/)});
