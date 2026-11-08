import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),folder='wjs-approved-2026-11-08';
const json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const mapping=await json(`public/catalog/images/${folder}.json`), sources=await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(sources.added,126);assert.equal(Object.keys(mapping).length,126);
assert.equal(sources.sourceRows,307);
assert.deepEqual(sources.skippedReasons,{'no-exact-supplier-sku-match':87,'needs-review':41,'existing-image-preserved':52,'quarantine':1});
const manifest=await json('public/catalog/images/manifest.json');let old={};
for(const f of ['images-a.json','images-b.json','images-galor.json','images-hot.json','images-new.json',...manifest.files.filter(f=>f!==folder+'.json').map(f=>'images/'+f)]){
 try {Object.assign(old,await json('public/catalog/'+f));}catch{}
}
for(const p of sources.products){
 assert.equal(p.designStatus,'ready');assert.equal(mapping[p.sku],p.image);assert.ok(!old[p.sku],p.sku+' must not replace any image mapping');
 const bytes=await readFile(new URL('public'+p.image,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),p.sha256);assert.equal(bytes.length,p.bytes);
 assert.ok(p.sourceSku);assert.ok(p.matchEvidence.includes('exact internal'));
}
for(const [supplier,sku,name] of [['7803A112WJS','HZ-CAF-00124','פ.מזגן מיצ לנסר מ08 פולבק מ16'],['8754E','HZ-CAF-00145','פ.מזגן מרצ ויטו מ15 ספרינטר מ18'],['8754E','HZ-CAF-00146','פ.מזגן מרצ ויטו מ15 ספרינטר מ18 פחם']]){
 const p=sources.products.find(p=>p.sku===sku);assert.equal(p.sourceSku,supplier);assert.equal(p.sourceTitle,name);assert.equal(p.siteOriginalTitle,name);
}
process.env.VERCEL='1';process.chdir('/proc');globalThis.fetch=async()=>{throw Error('No network');};
const {default:app}=await import(new URL('.vercel/output/functions/__server.func/index.mjs',root));
async function page(path){let r=await app.fetch(new Request('https://local.invalid'+path));for(let i=0;i<3&&[301,302,303,307,308].includes(r.status);i++)r=await app.fetch(new Request(new URL(r.headers.get('location'),'https://local.invalid')));assert.equal(r.status,200,path);return r.text();}
for(const p of sources.products){const html=await page('/product/'+p.sku);assert.ok(html.includes(p.image),p.sku+' exact image on product page');}
const index=await json('public/catalog/search-index.json'),tax=await json('public/catalog/display-taxonomy.json');const seen=new Set();
for(const cat of new Set(sources.products.map(p=>tax.bySku[p.sku]?.category||p.category))){const count=index.filter(h=>(tax.bySku[h.sku]?.category||h.category)===cat&&!tax.bySku[h.sku]?.hidden).length;for(let n=1;n<=Math.ceil(count/60);n++){const html=await page(`/results?category=${cat}&page=${n}`);for(const p of sources.products.filter(p=>(tax.bySku[p.sku]?.category||p.category)===cat))if(html.includes(p.image))seen.add(p.sku);}}
assert.equal(seen.size,126);
console.log('PASS WJS: 126 exact existing-SKU photos; no image replacements; shared SKUs matched by original title; all 126 product pages and all affected category pages; read-only cwd, no network');
