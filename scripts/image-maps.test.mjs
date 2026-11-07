import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("every image map requested by the loader exists and contains a real JSON map", async () => {
 const base = new URL("../public/catalog/", import.meta.url);
 const loader = await readFile(new URL("../src/lib/catalog-listing.ts", import.meta.url), "utf8");
 const list = loader.match(/const listed = (\[[^;]+\]);/s)?.[1];assert.ok(list);
 const maps = JSON.parse(list);
 const manifest = JSON.parse(await readFile(new URL("images/manifest.json",base), "utf8"));
 maps.push(...manifest.files.map(f=>"images/"+f));
 assert.ok(!maps.includes("images-galor.json"),"placeholder file must never be requested");
 for(const name of maps){const map=JSON.parse(await readFile(new URL(name,base),"utf8"));assert.equal(typeof map,"object",name);assert.ok(!Array.isArray(map));assert.ok(Object.values(map).every(x=>typeof x==="string"),name);}
});
