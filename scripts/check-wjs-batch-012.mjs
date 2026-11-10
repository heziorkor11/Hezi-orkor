import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),folder='wjs-batch-012';
const json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const mapping=await json(`public/catalog/images/${folder}.json`);
const meta=await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(meta.added,1150);assert.equal(Object.keys(mapping).length,1150);
assert.equal(meta.inputRows,1444);
assert.deepEqual(meta.skippedReasons,{'needs-review':283,'existing-image-preserved':10,'source-evidence-mismatch':1});
const man=await json('public/catalog/images/manifest.json');
assert.ok(man.files.includes(folder+'.json'));
let old={};
for(const f of ['images-a.json','images-b.json','images-galor.json','images-hot.json','images-new.json',...man.files.filter(f=>f!==folder+'.json').map(f=>'images/'+f)]){
  try{Object.assign(old,await json('public/catalog/'+f));}catch{}
}
for(const p of meta.products){
  assert.ok(!old[p.sku]);assert.equal(p.designStatus,'ready');assert.ok(p.readyZip.startsWith('batch_012_ready_'));
  assert.deepEqual(p.dimensions,[1200,1200]);assert.equal(p.image,mapping[p.sku]);
  const b=await readFile(new URL('public'+p.image,root));
  assert.equal(b.length,p.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256);
  assert.ok(b[0]===0x52&&b[8]===0x57);
}
process.env.VERCEL='1';process.chdir('/proc');globalThis.fetch=async()=>{throw Error('No network');};
const {default:app}=await import(new URL('.vercel/output/functions/__server.func/index.mjs',root));
async function page(path){let r=await app.fetch(new Request('https://local.invalid'+path));for(let i=0;i<3&&[301,302,303,307,308].includes(r.status);i++)r=await app.fetch(new Request(new URL(r.headers.get('location'),'https://local.invalid')));assert.equal(r.status,200,path);return r.text();}
for(const p of meta.products.slice(0,5))assert.ok((await page('/product/'+p.sku)).includes(p.image),p.sku);
console.log('PASS WJS batch012: 1150 ready; needs-review/existing skipped; webp magic ok');
