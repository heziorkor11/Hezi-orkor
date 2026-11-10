import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),folder='ac-batch-a01';
const json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const mapping=await json(`public/catalog/images/${folder}.json`);
const meta=await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(meta.added,11);assert.equal(Object.keys(mapping).length,11);
assert.equal(meta.addedNew,5);assert.equal(meta.replaced,6);
assert.equal(meta.inputRows,12);
assert.deepEqual(meta.skippedReasons,{'held-not-denso':1});
assert.deepEqual(meta.byCategory,{'ac-compressor':8,'ac-condenser':3});
assert.deepEqual(meta.byCatalogCategory,{'מדחס מזגן':8,'מעבה מזגן':3});
assert.deepEqual(meta.byBrand,{'Denso':11});
assert.deepEqual(new Set(meta.replacedSkus),new Set(['HZ-CMP-00038','HZ-CMP-00169','HZ-CMP-00293','HZ-CMP-00734','HZ-CND-00194','HZ-CND-00531']));
assert.deepEqual(new Set(meta.newSkus),new Set(['HZ-CMP-00130','HZ-CMP-00303','HZ-CMP-00357','HZ-CMP-00385','HZ-CND-00182']));
const blocked=new Set(['HZ-CND-00387']);
const man=await json('public/catalog/images/manifest.json');
assert.ok(man.files.includes(folder+'.json'));
assert.ok(man.files.indexOf(folder+'.json')>man.files.indexOf('ac-watermarked-2026-11-08.json'));
let old={};
for(const f of ['images-a.json','images-b.json','images-galor.json','images-hot.json','images-new.json',...man.files.filter(f=>f!==folder+'.json').map(f=>'images/'+f)]){
  try{Object.assign(old,await json('public/catalog/'+f));}catch{}
}
const skumap=await json('public/catalog/sku-map.json');
for(const p of meta.products){
  assert.ok(!blocked.has(p.sku),p.sku+' blocked');
  assert.equal(p.designStatus,'ready');
  assert.ok(p.readyZip.startsWith('batch_AC_A01_ready_'));
  assert.deepEqual(p.dimensions,[1200,1200]);
  assert.equal(p.image,mapping[p.sku]);
  if(p.imageType==='drawing') assert.match(p.image,/-drawing\.webp$/);
  else assert.match(p.image,/-oe-matched\.webp$/);
  assert.equal(p.brand,'Denso');
  assert.equal(p.parallelBrand,'DENSO');
  assert.equal(p.logoKept,true);
  assert.ok(['ac-compressor','ac-condenser'].includes(p.category),p.sku);
  if(p.replacedExisting){
    assert.ok(old[p.sku],p.sku+' should replace an existing image');
    assert.equal(p.replaceStatus,'pending_clean_source');
    assert.ok(p.previousImage);assert.ok(p.previousLogoBrand);
    assert.ok(!['NRF','Denso'].includes(p.previousLogoBrand),p.sku+' must not replace an NRF/Denso keep');
  }else{
    assert.ok(!old[p.sku],p.sku+' must not overwrite existing image');
  }
  const catalog=await json(`public/catalog/chunks/${skumap[p.sku]}.json`);
  const q=catalog.find(q=>q.sku===p.sku);
  assert.ok(q);assert.equal(q.name,p.name);assert.ok(!q.image);
  assert.equal(q.category,p.category);
  const b=await readFile(new URL('public'+p.image,root));
  assert.equal(b.length,p.bytes);
  assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256);
  assert.ok(b[0]===0x52&&b[8]===0x57);
}
assert.equal(meta.skipped.length,1);
assert.equal(meta.skipped[0].sku,'HZ-CND-00387');
assert.ok(!mapping['HZ-CND-00387']);
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
for(const sku of ['HZ-CMP-00130','HZ-CMP-00169','HZ-CND-00182','HZ-CND-00194']){
  const p=meta.products.find(x=>x.sku===sku);
  const html=await page('/product/'+sku);
  assert.ok(html.includes(p.image),sku);
  if(p.previousImage) assert.ok(!html.includes(p.previousImage),sku+' old image must not remain');
}
console.log('PASS ac-batch-a01: 11 Denso photos (5 new, 6 replacements); HZ-CND-00387 held; webp magic; replacements override watermarked map');
