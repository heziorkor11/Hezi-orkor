import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {constants as fsConstants} from 'node:fs';

const root = new URL('../', import.meta.url);
const folder = 'wjs-additives-2026-11-13';
const json = async (p) => JSON.parse(await readFile(new URL(p, root), 'utf8'));

const mapping = await json(`public/catalog/images/${folder}.json`);
const meta = await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(meta.added, 17);
assert.equal(meta.addedNew, 17);
assert.equal(meta.replaced, 0);
assert.equal(meta.inputRows, 17);
assert.equal(Object.keys(mapping).length, 17);
assert.deepEqual(meta.skippedReasons, {});
assert.deepEqual(meta.byCategory, {additives: 17});
assert.deepEqual(meta.byCatalogCategory, {'תוספים': 17});
assert.deepEqual(meta.byBrand, {MANNOL: 7, MOTUL: 10});
assert.equal(meta.ownerApproval, 'כן, תכין תמונות לתוספים');

const expected = Array.from({length: 17}, (_, i) => `HZ-ADD-${String(i + 1).padStart(5, '0')}`);
assert.deepEqual(Object.keys(mapping).sort(), expected);
assert.deepEqual(meta.products.map((p) => p.sku), expected);

const man = await json('public/catalog/images/manifest.json');
assert.ok(man.files.includes(folder + '.json'));

let old = {};
for (const f of [
  'images-a.json',
  'images-b.json',
  'images-galor.json',
  'images-hot.json',
  'images-new.json',
  ...man.files.filter((f) => f !== folder + '.json').map((f) => 'images/' + f),
]) {
  try {
    Object.assign(old, await json('public/catalog/' + f));
  } catch {}
}

const index = await json('public/catalog/search-index.json');
const byIndex = Object.fromEntries(index.map((h) => [h.sku, h]));

for (const p of meta.products) {
  assert.equal(p.designStatus, 'ready');
  assert.equal(p.imageType, 'photo');
  assert.equal(p.skuMatch, 'exact');
  assert.equal(p.supplierSku, p.sourceSku);
  assert.ok(p.matchEvidence.includes('exact WJS product-page JSON-LD sku'));
  assert.deepEqual(p.dimensions, [1200, 1200]);
  assert.equal(p.image, mapping[p.sku]);
  assert.match(p.image, new RegExp(`^/catalog/images/${folder}/${p.sku}-code-matched\\.webp$`));
  assert.ok(!old[p.sku], p.sku + ' must not replace an existing image mapping');
  assert.equal(p.category, 'additives');
  assert.equal(p.catalogCategory, 'תוספים');
  assert.ok(['MANNOL', 'MOTUL'].includes(p.brand), p.sku);
  assert.equal(p.brandVisualCheck, 'own-brand-logo-kept');
  const hit = byIndex[p.sku];
  assert.ok(hit, p.sku + ' in search index');
  assert.equal(hit.title, p.name);
  assert.equal(hit.category, 'additives');
  const b = await readFile(new URL('public' + p.image, root));
  assert.equal(b.length, p.bytes);
  assert.equal(createHash('sha256').update(b).digest('hex'), p.sha256);
  assert.ok(b[0] === 0x52 && b[8] === 0x57, p.sku + ' webp magic');
}

const vercelFunc = new URL('.vercel/output/functions/__server.func/index.mjs', root);
let pageChecked = false;
try {
  await access(vercelFunc, fsConstants.R_OK);
  process.env.VERCEL = '1';
  process.chdir('/proc');
  globalThis.fetch = async () => {
    throw Error('No network');
  };
  const {default: app} = await import(vercelFunc);
  async function page(path) {
    let r = await app.fetch(new Request('https://local.invalid' + path));
    for (let i = 0; i < 3 && [301, 302, 303, 307, 308].includes(r.status); i++) {
      r = await app.fetch(new Request(new URL(r.headers.get('location'), 'https://local.invalid')));
    }
    assert.equal(r.status, 200, path);
    return r.text();
  }
  const categoryHtml = await page('/results?category=additives');
  for (const p of meta.products) {
    const html = await page('/product/' + p.sku);
    assert.ok(html.includes(p.image), p.sku + ' exact image on product page');
    assert.ok(categoryHtml.includes(p.image), p.sku + ' exact image on additives category page');
  }
  pageChecked = true;
} catch (err) {
  if (err && err.code === 'ENOENT') {
    console.log('NOTE: vercel output missing; file-map checks passed, page checks skipped');
  } else {
    throw err;
  }
}

console.log(
  'PASS WJS additives 2026-11-13: 17 exact-SKU official photos (7 MANNOL, 10 MOTUL); no replacements; 1200x1200 webp; own-brand logos kept' +
    (pageChecked ? '; product + category pages ok' : ''),
);
