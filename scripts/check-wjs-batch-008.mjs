import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),folder='wjs-batch-008';
const json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const mapping=await json(`public/catalog/images/${folder}.json`);
const meta=await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(meta.added,604);assert.equal(Object.keys(mapping).length,604);
assert.equal(meta.inputRows,655);
assert.deepEqual(meta.skippedReasons,{'blocked-wrong-brand-watermark':6,'supplier-sku-not-unique-exact':13,'extra-gallery-unsupported':32});
assert.deepEqual(meta.byCategory,{steering:595,general:9});
const man=await json('public/catalog/images/manifest.json');
assert.ok(man.files.includes(folder+'.json'));
let old={};
for(const f of ['images-a.json','images-b.json','images-galor.json','images-hot.json','images-new.json',...man.files.filter(f=>f!==folder+'.json').map(f=>'images/'+f)]){
  try{Object.assign(old,await json('public/catalog/'+f));}catch{}
}
const skumap=await json('public/catalog/sku-map.json');
for(const p of meta.products){
  assert.ok(!old[p.sku]);assert.equal(p.designStatus,'ready');assert.ok(p.readyZip.startsWith('batch_008_ready_'));
  assert.deepEqual(p.dimensions,[1200,1200]);assert.equal(p.image,mapping[p.sku]);
  const catalog=await json(`public/catalog/chunks/${skumap[p.sku]}.json`);
  const q=catalog.find(q=>q.sku===p.sku);assert.ok(q);assert.equal(q.name,p.name);assert.ok(!q.image);
  const b=await readFile(new URL('public'+p.image,root));
  assert.equal(b.length,p.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256);
}
process.env.VERCEL='1';process.chdir('/proc');globalThis.fetch=async()=>{throw Error('No network');};
const {default:app}=await import(new URL('.vercel/output/functions/__server.func/index.mjs',root));
async function page(path){let r=await app.fetch(new Request('https://local.invalid'+path));for(let i=0;i<3&&[301,302,303,307,308].includes(r.status);i++)r=await app.fetch(new Request(new URL(r.headers.get('location'),'https://local.invalid')));assert.equal(r.status,200,path);return r.text();}
const samples={};for(const p of meta.products){if(!samples[p.category])samples[p.category]=p;}
for(const p of Object.values(samples))assert.ok((await page('/product/'+p.sku)).includes(p.image),p.sku);
for(const p of meta.products.slice(0,3))assert.ok((await page('/product/'+p.sku)).includes(p.image),p.sku);
console.log('PASS WJS batch008: 604 ready; gallery extras + blocked + non-unique skipped');
