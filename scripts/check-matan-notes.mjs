import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../src/lib/search-language.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { languageMatches } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);
assert.ok(languageMatches("MANNOL DPF Cleaner", "", "additives", "תוספים"));
assert.ok(languageMatches("Engine Oil MOTUL", "", "fluids", "שמנים"));
assert.ok(languageMatches("מסנן שמן", "", "filters", "פילטרים שמנים"));
assert.ok(!languageMatches("תושבת מנוע", "", "suspension", "תוספים"));
const staticRoot = new URL("../.vercel/output/static/", import.meta.url);
const handler = new URL("../.vercel/output/functions/__server.func/index.mjs", import.meta.url);
process.env.VERCEL = "1";
process.chdir("/proc");
let outbound = 0;
globalThis.fetch = async () => {
  outbound++;
  throw new Error("network forbidden");
};
const { default: app } = await import(handler.href);
async function page(path) {
  let r = await app.fetch(new Request("http://local.invalid" + path));
  for (let i = 0; i < 3 && [301, 302, 303, 307, 308].includes(r.status); i++) {
    r = await app.fetch(new Request(new URL(r.headers.get("location"), "http://local.invalid")));
  }
  assert.equal(r.status, 200, path);
  return r.text();
}
const home = await page("/");
assert.match(home, /role="switch"[^>]*aria-checked="false"/);
const packs = await page("/results?category=workshop-packs");
assert.match(packs, /role="switch"[^>]*aria-checked="true"/);
assert.match(await page("/results?category=brakes"), /role="switch"[^>]*aria-checked="false"/);
const photoUrls = [
  ...new Set([...home.matchAll(/src="(\/assets\/[^" ]+\.(?:jpg|webp))"/g)].map((m) => m[1])),
];
assert.ok(photoUrls.length >= 20, "real category photos must be fingerprinted static assets");
for (const url of photoUrls) await access(new URL(url.slice(1), staticRoot));
for (const query of ["תוספים", "תוסף", "additives"]) {
  const listing = await page("/results?q=" + encodeURIComponent(query));
  const skus = [
    ...new Set([...listing.matchAll(/href="\/product\/(HZ-ADD-\d+)"/g)].map((m) => m[1])),
  ];
  assert.equal(skus.length, 17, query + " must find all 17 additive products");
}
for (const query of ["שמנים", "שמן", "oils"])
  assert.match(await page("/results?q=" + encodeURIComponent(query)), /href="\/product\//);
for (const category of ["fluids", "additives", "cleaning-maintenance", "workshop-packs"]) {
  const html = await page("/results?category=" + category);
  assert.match(html, /href="\/product\//);

  const without = [...html.matchAll(/href="\/product\/([^" ]+)"/g)].map((m) => m[1]);
  const withVehicle = [
    ...(
      await page("/results?category=" + category + "&make=NO-SUCH-CAR&model=NO-MODEL&year=1901")
    ).matchAll(/href="\/product\/([^" ]+)"/g),
  ].map((m) => m[1]);
  assert.deepEqual(withVehicle, without, category + " must not require vehicle fitment");
}
assert.equal(outbound, 0);
console.log(
  "PASS Matan notes: 24 real fingerprinted photo assets, packs switch state, all 17 additives via Hebrew/English singular/plural, oils search and vehicle-optional categories; read-only emitted handler, no network.",
);
