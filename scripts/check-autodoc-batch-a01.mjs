import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),folder='autodoc-batch-a01';
const json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const mapping=await json(`public/catalog/images/${folder}.json`);
const meta=await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(meta.added,213);assert.equal(Object.keys(mapping).length,213);
assert.equal(meta.inputRows,220);
assert.deepEqual(meta.skippedReasons,{'blocked-needs-review':7});
assert.deepEqual(meta.byCatalogCategory,{'רדיאטורים':199,'בולם זעזועים':1,'מתלים':1,'פילטרים':12});
const blocked=new Set(['HZ-GEN-04360','HZ-GEN-04451','HZ-GEN-04519','HZ-GEN-04533','HZ-GEN-04435','HZ-GEN-02175','HZ-CAF-00181']);
const man=await json('public/catalog/images/manifest.json');
assert.ok(man.files.includes(folder+'.json'));
let old={};
for(const f of ['images-a.json','images-b.json','images-galor.json','images-hot.json','images-new.json',...man.files.filter(f=>f!==folder+'.json').map(f=>'images/'+f)]){
  try{Object.assign(old,await json('public/catalog/'+f));}catch{}
}
const skumap=await json('public/catalog/sku-map.json');
function compact(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
for(const p of meta.products){
  assert.ok(!blocked.has(p.sku),p.sku+' blocked');
  assert.ok(!old[p.sku],p.sku+' must not overwrite existing image');
  assert.equal(p.designStatus,'ready');
  assert.ok(p.readyZip.startsWith('batch_A01_ready_'));
  assert.deepEqual(p.dimensions,[1200,1200]);
  assert.equal(p.image,mapping[p.sku]);
  assert.match(p.image,/-oe-matched\.webp$/);
  assert.ok(p.matchedOe);assert.ok(p.parallelBrand);assert.ok(p.parallelArticle);assert.ok(p.autodocProductUrl);
  const catalog=await json(`public/catalog/chunks/${skumap[p.sku]}.json`);
  const q=catalog.find(q=>q.sku===p.sku);
  assert.ok(q);assert.equal(q.name,p.name);assert.ok(!q.image);
  const blob=compact(q.oe||'');
  assert.ok(blob.includes(compact(p.matchedOe)),p.sku+' matched_oe not in catalog oe');
  const b=await readFile(new URL('public'+p.image,root));
  assert.equal(b.length,p.bytes);
  assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256);
  assert.ok(b[0]===0x52&&b[8]===0x57);
}
process.env.VERCEL='1';process.chdir('/proc');
globalThis.fetch=async()=>{throw Error('No network');};
const {default:app}=await import(new URL('.vercel/output/functions/__server.func/index.mjs',root));
async function page(path){
  let r=await app.fetch(new Request('https://local.invalid'+path));
  for(let i=0;i<3&&[301,302,303,307,308].includes(r.status);i++){
    r=await app.fetch(new Request(new URL(r.headers.get('location'),'https://local.invalid')));
  }
  assert.equal(r.status,200,path);return r.text();
}
const samples={};
for(const p of meta.products){if(!samples[p.catalogCategory])samples[p.catalogCategory]=p;}
for(const p of Object.values(samples))assert.ok((await page('/product/'+p.sku)).includes(p.image),p.sku);
for(const p of meta.products.slice(0,5))assert.ok((await page('/product/'+p.sku)).includes(p.image),p.sku);
console.log('PASS Autodoc batch A01: 213 ready OE-matched photos; 7 blocked skipped; provenance+oe check; webp magic; no replacements');
