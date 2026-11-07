import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("image manifest references only existing parseable image maps", async () => {
 const root = new URL("../public/catalog/images/", import.meta.url);
 const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));
 for (const name of manifest.files) {
   const data = JSON.parse(await readFile(new URL(name, root), "utf8"));
   assert.equal(typeof data, "object");
 }
 for (const n of ["00", "01", "02", "03", "04", "05"])
   assert.ok(!manifest.files.includes(`images-new-${n}.json`));
});
test("mobile uses the existing WhatsApp tab, not a duplicate content overlay", async () => {
 const shell = await readFile(new URL("../src/components/shop-shell.tsx", import.meta.url), "utf8");
 const tabs = await readFile(new URL("../src/components/mobile-tabbar.tsx", import.meta.url), "utf8");
 const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
 assert.match(shell, /hidden size-14/);
 assert.match(shell, /md:grid/);
 assert.match(tabs, /wa\.me\/\$\{brand.whatsapp\}/);
 assert.match(tabs, /4rem\+env\(safe-area-inset-bottom/);
 assert.match(css, /padding-bottom: calc\(88px \+ env\(safe-area-inset-bottom/);
});
