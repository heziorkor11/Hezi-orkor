import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),folder='wjs-addendum-drawings-004';
const json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const mapping=await json(`public/catalog/images/${folder}.json`),meta=await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(Object.keys(mapping).length,2);assert.equal(meta.added,2);
assert.deepEqual(Object.keys(mapping).sort(),['HZ-BRK-01321','HZ-BRK-01322']);
const man=await json('public/catalog/images/manifest.json');let old={};
for(const f of ['images-a.json','images-b.json','images-galor.json','images-hot.json','images-new.json',...man.files.filter(f=>f!==folder+'.json').map(f=>'images/'+f)])try{Object.assign(old,await json('public/catalog/'+f));}catch{}
for(const p of meta.products){
  assert.ok(!old[p.sku]);assert.equal(p.imageType,'drawing');assert.equal(mapping[p.sku],p.image);
  const b=await readFile(new URL('public'+p.image,root));assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256);
}
process.env.VERCEL='1';process.chdir('/proc');globalThis.fetch=async()=>{throw Error('No network');};
const {default:app}=await import(new URL('.vercel/output/functions/__server.func/index.mjs',root));
for(const sku of ['HZ-BRK-01321','HZ-BRK-01322']){
  let r=await app.fetch(new Request('https://local.invalid/product/'+sku));
  for(let i=0;i<3&&[301,302,303,307,308].includes(r.status);i++)r=await app.fetch(new Request(new URL(r.headers.get('location'),'https://local.invalid')));
  assert.equal(r.status,200);assert.ok((await r.text()).includes(mapping[sku]));
}
console.log('PASS addendum drawings 01321+01322; no replacements; product pages; readonly/no network');
