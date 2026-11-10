import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),folder='ac-batch-001';
const json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const mapping=await json(`public/catalog/images/${folder}.json`);
const meta=await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(meta.added,70);assert.equal(Object.keys(mapping).length,70);
assert.equal(meta.inputRows,74);
assert.deepEqual(meta.skippedReasons,{'needs-review':4});
assert.deepEqual(meta.byCategory,{'ac-compressor':13,'ac-condenser':57});
assert.deepEqual(meta.byCatalogCategory,{'מדחס מזגן':13,'מעבה מזגן':57});
const blocked=new Set(['HZ-CMP-00503','HZ-HDL-03520','HZ-HDL-03566','HZ-CND-00738']);
const man=await json('public/catalog/images/manifest.json');
assert.ok(man.files.includes(folder+'.json'));
let old={};
for(const f of ['images-a.json','images-b.json','images-galor.json','images-hot.json','images-new.json',...man.files.filter(f=>f!==folder+'.json').map(f=>'images/'+f)]){
  try{Object.assign(old,await json('public/catalog/'+f));}catch{}
}
const skumap=await json('public/catalog/sku-map.json');
for(const p of meta.products){
  assert.ok(!blocked.has(p.sku),p.sku+' blocked');
  assert.ok(!old[p.sku],p.sku+' must not overwrite existing image');
  assert.equal(p.designStatus,'ready');
  assert.ok(p.readyZip.startsWith('ac_001_ready_'));
  assert.deepEqual(p.dimensions,[1200,1200]);
  assert.equal(p.image,mapping[p.sku]);
  if(p.imageType==='drawing') assert.match(p.image,/-drawing\.webp$/);
  else assert.match(p.image,/-code-matched\.webp$/);
  assert.ok(p.supplierSku);
  assert.equal(p.supplier,'Galor');
  assert.ok(['ac-compressor','ac-condenser'].includes(p.category),p.sku);
  const catalog=await json(`public/catalog/chunks/${skumap[p.sku]}.json`);
  const q=catalog.find(q=>q.sku===p.sku);
  assert.ok(q);assert.equal(q.name,p.name);assert.ok(!q.image);
  assert.equal(q.category,p.category);
  const b=await readFile(new URL('public'+p.image,root));
  assert.equal(b.length,p.bytes);
  assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256);
  assert.ok(b[0]===0x52&&b[8]===0x57);
}
assert.equal(meta.skipped.length,4);
for(const s of meta.skipped) assert.ok(blocked.has(s.sku),s.sku);
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
console.log('PASS ac_001: 70 ready Gal-Or code-matched photos; 4 needs-review skipped; provenance; webp magic; no replacements');
