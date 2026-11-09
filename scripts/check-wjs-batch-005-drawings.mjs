import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),folder='wjs-batch-005-drawings';
const json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const mapping=await json(`public/catalog/images/${folder}.json`);
const meta=await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(meta.added,201);
assert.equal(Object.keys(mapping).length,201);
assert.equal(meta.inputRows,213);
assert.deepEqual(meta.skippedReasons,{'blocked-needs-review':10,'existing-image-preserved':2});
assert.deepEqual(meta.byBatch,{batch_005:185,drawing_recovery_001:16});
assert.deepEqual(meta.byCategory,{brakes:29,shocks:85,steering:25,general:10,filters:52});
const man=await json('public/catalog/images/manifest.json');
assert.ok(man.files.includes(folder+'.json'));
let old={};
for(const f of ['images-a.json','images-b.json','images-galor.json','images-hot.json','images-new.json',...man.files.filter(f=>f!==folder+'.json').map(f=>'images/'+f)]){
  try{Object.assign(old,await json('public/catalog/'+f));}catch{}
}
const blocked=new Set(['HZ-BRK-01473','HZ-BRK-01487','HZ-BRK-01147','HZ-BRK-01152','HZ-BRK-01318','HZ-BRK-01379','HZ-BRK-01387','HZ-BRK-01148','HZ-BRK-01149','HZ-BRK-01151']);
const skumap=await json('public/catalog/sku-map.json');
for(const p of meta.products){
  assert.ok(!old[p.sku],p.sku+' must not overwrite existing image');
  assert.ok(!blocked.has(p.sku),p.sku+' blocked');
  assert.equal(p.designStatus,'ready');
  assert.ok(p.readyZip.includes('ready_'));
  assert.deepEqual(p.dimensions,[1200,1200]);
  assert.equal(p.image,mapping[p.sku]);
  assert.match(p.image,/-(code-matched|drawing)\.webp$/);
  const catalog=await json(`public/catalog/chunks/${skumap[p.sku]}.json`);
  const q=catalog.find(q=>q.sku===p.sku);
  assert.ok(q);assert.equal(q.name,p.name);assert.ok(!q.image);
  const b=await readFile(new URL('public'+p.image,root));
  assert.equal(b.length,p.bytes);
  assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256);
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
const samples=meta.products.filter(p=>['shocks','filters','brakes'].includes(p.category)).reduce((a,p)=>{if(!a[p.category])a[p.category]=p;return a;},{});
for(const p of Object.values(samples)){
  assert.ok((await page('/product/'+p.sku)).includes(p.image),p.sku+' product page image');
}
for(const p of meta.products.slice(0,5).concat(meta.products.filter(p=>p.batch==='drawing_recovery_001').slice(0,3))){
  assert.ok((await page('/product/'+p.sku)).includes(p.image),p.sku);
}
console.log('PASS WJS batch005+drawing_recovery: 201 ready code-matched images; 10 blocked + 2 existing skipped; no replacements; product pages; readonly/no network');
