/** IDs only: never copy product names/prices from private workbook sheets or alter source catalog. */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  JSZip = require("jszip");
const sources = [
  "artifacts/Hezi_Master_Catalog.xlsx",
  "artifacts/hezi-catalog/incoming/Hezi_Master_Catalog.xlsx",
  "artifacts/Laufer_Lighting.xlsx",
];
const all = new Set();
const collect = (text) => {
  for (const m of text.matchAll(/HZ-[A-Z0-9]+-[0-9]{5}/g)) all.add(m[0]);
};
for (const file of sources) {
  const zip = await JSZip.loadAsync(await readFile(resolve(file)));
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir && name.endsWith(".xml") && /sharedStrings|worksheets\/sheet/.test(name))
      collect(await entry.async("string"));
  }
}
async function scan(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, item.name);
    collect(item.name);
    if (item.isDirectory()) await scan(file);
    else if (item.name.endsWith(".json")) collect(await readFile(file, "utf8"));
  }
}
await scan(resolve("public/catalog"));
const blocked = JSON.parse(await readFile("src/lib/admin/sku-blocklist.json", "utf8"));
for (const sku of blocked.skus) all.add(sku);
await writeFile(
  "src/lib/admin/sku-reservations.json",
  JSON.stringify(
    {
      version: 1,
      sources: [...sources, "public/catalog/**/*.json", "src/lib/admin/sku-blocklist.json"],
      skus: [...all].sort(),
    },
    null,
    2,
  ) + "\n",
);
console.log(`Reserved ${all.size} source/historical catalog SKUs, including hidden/blocked IDs`);
