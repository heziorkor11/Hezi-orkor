import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const catalog = new URL("../public/catalog/", import.meta.url);
const map = JSON.parse(await readFile(new URL("sku-map.json", catalog), "utf8"));
const policy = JSON.parse(await readFile(new URL("visibility-overrides.json", catalog), "utf8"));
for (const sku of ["HZ-GEN-01392", "HZ-GEN-01393"]) {
 assert.equal(policy.bySku[sku].hidden, true);
 const chunk = JSON.parse(await readFile(new URL(`chunks/${map[sku]}.json`, catalog), "utf8"));
 assert.ok(chunk.some(p => p.sku === sku), "source row must remain intact");
}
const handler = new URL("../.vercel/output/functions/__server.func/index.mjs", import.meta.url);
process.env.VERCEL = "1"; process.chdir("/proc");
let outbound = 0;globalThis.fetch=async()=>{outbound++;throw new Error("network forbidden");};
const { default: app }=await import(handler.href);
for(const sku of ["HZ-GEN-01392","HZ-GEN-01393"]){
 const r=await app.fetch(new Request("http://local.invalid/product/"+sku));assert.equal(r.status,404,sku);
 const html=await r.text();assert.match(html,/<h1[^>]*>העמוד לא נמצא<\/h1>/);assert.doesNotMatch(html,/<h1[^>]*>בולם/);
 const search=await app.fetch(new Request("http://local.invalid/results?q="+sku));assert.equal(search.status,200);
 assert.ok(!(await search.text()).includes(`href="/product/${sku}"`));
}
for(const path of ["/","/results?category=shocks","/product/HZ-GEN-01391"]){
 const r=await app.fetch(new Request("http://local.invalid"+path));assert.equal(r.status,200,path);const html=await r.text();
 for(const sku of ["HZ-GEN-01392","HZ-GEN-01393"])assert.ok(!html.includes(`href="/product/${sku}"`));
}
assert.equal(outbound,0);console.log("PASS: both hidden product URLs 404; absent from search/category/home/related; source rows retained.");
