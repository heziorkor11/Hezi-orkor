import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),folder='wjs-disc-batch-001';const json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const mapping=await json(`public/catalog/images/${folder}.json`),meta=await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(meta.added,132);assert.equal(Object.keys(mapping).length,132);assert.equal(meta.inputRows,189);assert.deepEqual(meta.skippedReasons,{'needs-review':57});
const man=await json('public/catalog/images/manifest.json');let old={};
for(const f of ['images-a.json','images-b.json','images-galor.json','images-hot.json','images-new.json',...man.files.filter(f=>f!==folder+'.json').map(f=>'images/'+f)])try{Object.assign(old,await json('public/catalog/'+f));}catch{}
const skumap=await json('public/catalog/sku-map.json');
for(const p of meta.products){
 assert.ok(!old[p.sku],p.sku+' existing image must not be overwritten');assert.equal(p.designStatus,'ready');assert.match(p.readyZip,/^batch_001_ready_/);assert.equal(p.category,'brakes');assert.deepEqual(p.dimensions,[1200,1200]);assert.equal(p.sourceTitle,p.nameOriginal);assert.equal(p.image,mapping[p.sku]);
 const catalog=await json(`public/catalog/chunks/${skumap[p.sku]}.json`);const q=catalog.find(q=>q.sku===p.sku);assert.ok(q);assert.equal(q.name,p.name);assert.equal(q.nameOriginal,p.sourceTitle);assert.ok(!q.image);
 const b=await readFile(new URL('public'+p.image,root));assert.equal(b.length,p.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256);
}
process.env.VERCEL='1';process.chdir('/proc');globalThis.fetch=async()=>{throw Error('No network');};const {default:app}=await import(new URL('.vercel/output/functions/__server.func/index.mjs',root));
async function page(path){let r=await app.fetch(new Request('https://local.invalid'+path));for(let i=0;i<3&&[301,302,303,307,308].includes(r.status);i++)r=await app.fetch(new Request(new URL(r.headers.get('location'),'https://local.invalid')));assert.equal(r.status,200,path);return r.text();}
for(const p of meta.products)assert.ok((await page('/product/'+p.sku)).includes(p.image),p.sku+' correct product image');
const seen=new Set();const index=await json('public/catalog/search-index.json'),tax=await json('public/catalog/display-taxonomy.json');const count=index.filter(p=>(tax.bySku[p.sku]?.category||p.category)==='brakes'&&!tax.bySku[p.sku]?.hidden).length;
for(let n=1;n<=Math.ceil(count/60);n++){const h=await page('/results?category=brakes&page='+n);for(const p of meta.products)if(h.includes(p.image))seen.add(p.sku);}
assert.equal(seen.size,132);console.log('PASS WJS discs batch001: 132 ready exact SKU/title photos, zero replacements, all product pages and brake category pages; 57 needs-review excluded; read-only cwd, no network');
