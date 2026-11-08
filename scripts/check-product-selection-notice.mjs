import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const component=await readFile(new URL('src/components/product-selection-notice.tsx',root),'utf8');
assert.match(component,/text-xs font-normal leading-relaxed text-muted/);
assert.ok(!/font-bold|font-semibold|font-extrabold|text-red|role="alert"/.test(component));
const cart=await readFile(new URL('src/routes/cart.tsx',root),'utf8');
assert.ok(cart.indexOf('<ProductSelectionNotice />')>cart.indexOf('סיכום מחירי הסל'));
assert.ok(cart.indexOf('<ProductSelectionNotice />')<cart.indexOf('פרטי הזמנה'));
process.env.VERCEL='1';process.chdir('/proc');globalThis.fetch=async()=>{throw Error('No network');};
const {default:app}=await import(new URL('.vercel/output/functions/__server.func/index.mjs',root));
for(const sku of ['HZ-GEN-00023','HZ-CAF-00124']){
 let r=await app.fetch(new Request('https://local.invalid/product/'+sku));
 for(let i=0;i<3&&[301,302,303,307,308].includes(r.status);i++)r=await app.fetch(new Request(new URL(r.headers.get('location'),'https://local.invalid')));
 assert.equal(r.status,200);const html=await r.text(),note=html.match(/<p data-product-selection-notice[^>]*>(.*?)<\/p>/s);assert.ok(note);
 assert.match(note[1],/בחירת החלק המתאים לרכב באחריות הלקוח/);assert.match(note[1],/הכול בכפוף להוראות הדין/);
 assert.ok(html.indexOf('data-product-selection-notice')>html.indexOf('הוסף להצעה'));
}
console.log('PASS subtle selection/return notice: emitted product pages, after actions, normal-weight small muted text, shared cart placement after total; readonly/no network. Mobile browser QA still pending.');
