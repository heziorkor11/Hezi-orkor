import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const handler = new URL("../.vercel/output/functions/__server.func/index.mjs", import.meta.url);
const visibility = JSON.parse(await readFile(new URL("../public/catalog/display-taxonomy.json", import.meta.url), "utf8")).bySku;
process.env.VERCEL="1"; process.chdir("/proc");
let outbound=0;globalThis.fetch=async()=>{outbound++;throw new Error("network forbidden");};
const { default: app }=await import(handler.href);
async function page(path,status=200){const r=await app.fetch(new Request("http://local.invalid"+path));assert.equal(r.status,status,path);return r.text();}
const home=await page("/");assert.doesNotMatch(home,/results\?category=lights/);
const lightsRes=await app.fetch(new Request("http://local.invalid/results?category=lights"));
assert.ok([301,302,303,307,308].includes(lightsRes.status),`lights category should redirect, got ${lightsRes.status}`);
const lightsLoc=new URL(lightsRes.headers.get("location")||"http://missing.invalid", "http://local.invalid");
assert.equal(lightsLoc.pathname,"/results");assert.equal(lightsLoc.search,"");
assert.match(await page("/cart"),/סל הקניות/);
for(const sku of ["HZ-GEN-01392","HZ-GEN-01393"]){
 if(visibility[sku]?.hidden){await page("/product/"+sku,404);continue;}
 const html=await page("/product/"+sku);const dl=html.match(/<dl[\s\S]*?<\/dl>/)?.[0];assert.ok(dl);
 assert.match(dl,/אורלנדו/);assert.match(dl,/2011–2025/);assert.doesNotMatch(dl,/2008–2011|2013–2015/);
 assert.match(html,/שנות הכותרת שונות מנתוני ההתאמה/);
}
assert.equal(outbound,0);console.log("PASS: hidden lights category redirects away, preserved hidden products, cart shell, coherent fitment display and warning; readonly/no network.");
