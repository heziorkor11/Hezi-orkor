import assert from "node:assert/strict";
const moduleURL = new URL("../.vercel/output/functions/__server.func/index.mjs", import.meta.url);
process.env.VERCEL = "1";
process.chdir("/proc");
let network = 0;
globalThis.fetch = async () => { network++; throw new Error("Network forbidden"); };
const { default: app } = await import(moduleURL.href);
for (const path of ["/", "/results?category=brakes", "/product/HZ-GEN-00005"]) {
 const r = await app.fetch(new Request("http://local.invalid" + path));
 assert.equal(r.status, 200, path);
 const html = await r.text();
 assert.match(html, /aria-label="ניווט תחתון"/);
 assert.match(html, /hidden size-14/);
 assert.match(html, /https:\/\/wa.me\//);
 if (path.includes("product")) assert.match(html.split("<h1")[0], /data-product-placeholder/);
 if (path.includes("category=brakes")) assert.match(html, /href="\/product\/HZ-/);
 console.log("PASS emitted server", path);
}
// Removed כללי category redirects home.
{
 const r = await app.fetch(new Request("http://local.invalid/results?category=general"), { redirect: "manual" });
 assert.ok([200, 301, 302, 307, 308].includes(r.status), `general status ${r.status}`);
 const html = await r.text();
 assert.doesNotMatch(html, /Application error|TypeError/i);
 assert.ok(!html.includes("category=general") || r.status >= 300, "general listing must not stay as a live category page");
}
assert.equal(network, 0);
