import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),folder='ac-batch-002';
const json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const mapping=await json(`public/catalog/images/${folder}.json`);
const meta=await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(meta.added,153);assert.equal(Object.keys(mapping).length,153);
assert.equal(meta.inputRows,163);
assert.deepEqual(meta.skippedReasons,{
  'held-oil-cooler-and-condenser-drawing':8,
  'held-printed-french-car-code':1,
  'held-denso-image-nrf-name':1,
});
assert.deepEqual(meta.byCategory,{'ac-condenser':153});
assert.deepEqual(meta.byCatalogCategory,{'מעבה מזגן':153});
assert.deepEqual(meta.byBrand,{'NRF':147,'Denso':6});
const held=new Set(['HZ-CND-00157','HZ-CND-00158','HZ-CND-00373','HZ-CND-00374','HZ-CND-00414','HZ-CND-00450','HZ-CND-00451','HZ-CND-00452','HZ-CND-00195','HZ-CND-00179']);
const man=await json('public/catalog/images/manifest.json');
assert.ok(man.files.includes(folder+'.json'));
let old={};
for(const f of ['images-a.json','images-b.json','images-galor.json','images-hot.json','images-new.json',...man.files.filter(f=>f!==folder+'.json').map(f=>'images/'+f)]){
  try{Object.assign(old,await json('public/catalog/'+f));}catch{}
}
const skumap=await json('public/catalog/sku-map.json');
assert.ok(mapping['HZ-CND-00082']);
for(const p of meta.products){
  assert.ok(!held.has(p.sku),p.sku+' held');
  assert.ok(!old[p.sku],p.sku+' must not overwrite existing image');
  assert.equal(p.designStatus,'ready');
  assert.ok(p.readyZip.startsWith('ac_002_nrf_denso_ready_'));
  assert.deepEqual(p.dimensions,[1200,1200]);
  assert.equal(p.image,mapping[p.sku]);
  if(p.imageType==='drawing') assert.match(p.image,/-drawing\.webp$/);
  else assert.match(p.image,/-code-matched\.webp$/);
  assert.ok(p.supplierSku);
  assert.equal(p.supplier,'Galor');
  assert.ok(['NRF','Denso'].includes(p.brand),p.sku);
  assert.equal(p.logoKept,true);
  assert.equal(p.category,'ac-condenser');
  const catalog=await json(`public/catalog/chunks/${skumap[p.sku]}.json`);
  const q=catalog.find(q=>q.sku===p.sku);
  assert.ok(q);assert.equal(q.name,p.name);assert.ok(!q.image);
  assert.equal(q.category,'ac-condenser');
  const b=await readFile(new URL('public'+p.image,root));
  assert.equal(b.length,p.bytes);
  assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256);
  assert.ok(b[0]===0x52&&b[8]===0x57);
}
assert.equal(meta.skipped.length,10);
for(const s of meta.skipped) assert.ok(held.has(s.sku),s.sku);
for(const sku of held) assert.ok(!mapping[sku],sku);
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
const samples=[meta.products.find(p=>p.brand==='NRF'&&p.imageType==='drawing'),meta.products.find(p=>p.brand==='Denso'),meta.products.find(p=>p.sku==='HZ-CND-00082')];
for(const p of samples) assert.ok((await page('/product/'+p.sku)).includes(p.image),p.sku);
for(const p of meta.products.slice(0,5))assert.ok((await page('/product/'+p.sku)).includes(p.image),p.sku);
console.log('PASS ac_002: 153 ready NRF/Denso condenser photos; 10 held skipped; provenance; webp magic; no replacements');
