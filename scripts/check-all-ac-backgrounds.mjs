import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url), json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const qa=await json('public/catalog/images/ac-all-background-qa.json');
assert.equal(qa.initialScanned,1247);assert.equal(qa.initialFlagged,20);assert.equal(qa.fixed.length,4);assert.equal(qa.removed.length,2);assert.equal(qa.cleared.length,14);
let map={};for(const f of ['ac-approved-2026-11-08','ac-additional-2026-11-08','ac-watermarked-2026-11-08'])Object.assign(map,await json(`public/catalog/images/${f}.json`));
assert.equal(Object.keys(map).length,1245);assert.equal(qa.remaining.length,1245);
for(const p of qa.remaining){assert.equal(map[p.sku],p.image);assert.deepEqual(p.dimensions,[1200,1200]);assert.equal(createHash('sha256').update(await readFile(new URL('public'+p.image,root))).digest('hex'),p.sha256);}
for(const sku of qa.removed)assert.ok(!map[sku]);
process.env.VERCEL='1';process.chdir('/proc');globalThis.fetch=async()=>{throw Error('No network');};const {default:app}=await import(new URL('.vercel/output/functions/__server.func/index.mjs',root));
async function page(sku){let r=await app.fetch(new Request('https://local.invalid/product/'+sku));for(let i=0;i<3&&[301,302,303,307,308].includes(r.status);i++)r=await app.fetch(new Request(new URL(r.headers.get('location'),'https://local.invalid')));assert.equal(r.status,200);return r.text();}
for(const p of qa.fixed)assert.ok((await page(p.sku)).includes(map[p.sku]));
for(const sku of qa.removed){const html=await page(sku);const photo=html.split('data-product-photo')[1]?.split('</div>')[0];assert.ok(photo?.includes('data-product-placeholder'),sku+' neutral placeholder');}
console.log('PASS ALL AC background QA: 1247 scanned; 20 candidates = 4 fixes + 2 unmapped + 14 actual-product edges/shadow; 1245 final hashes/dimensions; corrected pages and removed-photo placeholders; readonly/no network');
