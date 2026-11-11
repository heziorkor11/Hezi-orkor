import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),folder='ac-batch-005';
const json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const mapping=await json(`public/catalog/images/${folder}.json`);
const meta=await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(meta.added,12);assert.equal(Object.keys(mapping).length,12);
assert.equal(meta.addedNew,8);assert.equal(meta.replaced,4);
assert.equal(meta.inputRows,12);
assert.deepEqual(meta.byCategory,{'ac-compressor':3,'ac-condenser':9});
assert.deepEqual(meta.byCatalogCategory,{'מדחס מזגן':3,'מעבה מזגן':9});
assert.deepEqual(meta.byBrand,{'NRF':11,'Denso':1});
const replaced=new Set(['HZ-CMP-00091','HZ-CMP-00292','HZ-CMP-00350','HZ-CND-00079']);
const addedNew=new Set(['HZ-CND-00030','HZ-CND-00281','HZ-CND-00307','HZ-CND-00362','HZ-CND-00363','HZ-CND-00550','HZ-CND-00643','HZ-CND-00717']);
assert.deepEqual(new Set(meta.replacedSkus),replaced);
assert.deepEqual(new Set(meta.newSkus),addedNew);
for(const sku of ['HZ-CND-00164','HZ-CND-00265']) assert.ok(!mapping[sku],sku+' must not be uploaded');
const man=await json('public/catalog/images/manifest.json');
assert.ok(man.files.includes(folder+'.json'));
assert.ok(man.files.indexOf(folder+'.json')>man.files.indexOf('ac-watermarked-2026-11-08.json'));
let old={};
for(const f of ['images-a.json','images-b.json','images-galor.json','images-hot.json','images-new.json',...man.files.filter(f=>f!==folder+'.json').map(f=>'images/'+f)]){
  try{Object.assign(old,await json('public/catalog/'+f));}catch{}
}
const skumap=await json('public/catalog/sku-map.json');
for(const p of meta.products){
  assert.equal(p.designStatus,'ready');
  assert.equal(p.warrantyTagRemovedByAi,true);
  assert.match(p.ownerApproval,/כן, תעלה את 12 התמונות שתוקנו ב-AI/);
  assert.deepEqual(p.dimensions,[1200,1200]);
  assert.equal(p.image,mapping[p.sku]);
  if(p.imageType==='drawing') assert.match(p.image,/-drawing\.webp$/);
  else if(p.sku==='HZ-CND-00079') assert.match(p.image,/-code-matched\.webp$/);
  else assert.match(p.image,/-oe-matched\.webp$/);
  assert.ok(['NRF','Denso'].includes(p.brand),p.sku);
  assert.ok(['NRF','DENSO'].includes(p.parallelBrand),p.sku);
  assert.equal(p.logoKept,true);
  assert.ok(['ac-compressor','ac-condenser'].includes(p.category),p.sku);
  if(p.replacedExisting){
    assert.ok(replaced.has(p.sku),p.sku);
    assert.ok(old[p.sku],p.sku+' should replace an existing image');
    assert.ok(p.previousImage);
    assert.match(p.previousImage,/watermark-kept\.webp$/);
    assert.ok(old[p.sku]===p.previousImage || old[p.sku].includes('watermark-kept'),p.sku+' previous should be tagged');
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
function catalogImageSrcs(html){
  return [...html.matchAll(/\/catalog\/images\/[^"'>\s]+/g)].map(m=>m[0]);
}
const samples=['HZ-CMP-00091','HZ-CMP-00292','HZ-CMP-00350','HZ-CND-00079','HZ-CND-00030','HZ-CND-00362'];
for(const sku of samples){
  const p=meta.products.find(x=>x.sku===sku);
  const html=await page('/product/'+sku);
  assert.ok(html.includes(p.image),sku+' new image');
  if(p.previousImage) assert.ok(!html.includes(p.previousImage),sku+' old image must not remain');
  const srcs=catalogImageSrcs(html).filter(s=>s.includes(sku) || (p.previousImage && s===p.previousImage));
  const unique=new Set(srcs);
  assert.equal(unique.size,1,sku+' must show exactly one catalog image, got '+[...unique].join(','));
  assert.ok(unique.has(p.image),sku);
}
console.log('PASS ac-batch-005: 12 AI-fixed NRF/Denso photos (8 new, 4 replacements); warranty tag removed; 00164/00265 excluded; webp magic; replacements override watermarked map; exactly one image per product page');
