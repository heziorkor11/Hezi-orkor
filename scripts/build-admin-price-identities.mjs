/** Derive literal manufacturer names only; never infer actual brand from OE cross-references. */
import { readFile, writeFile } from "node:fs/promises";
const rows = JSON.parse(
  await readFile(new URL("../public/catalog/search-index.json", import.meta.url), "utf8"),
);
const brands = {};
for (const p of rows) {
  const m = p.title.match(
    /\b(MOTUL|TOTAL|NGK|DENSO|BOSCH|MAHLE|MANNOL|CASTROL|MOBIL|PREFIX|KYB|SACHS|SKF|INA|BREMBO|VALEO|TRW|FEBI|LPR)\b/i,
  );
  if (m) brands[p.sku] = m[0].toUpperCase();
}
await writeFile(
  new URL("../public/catalog/price-identities.json", import.meta.url),
  JSON.stringify(brands),
);
console.log(
  `Derived ${Object.keys(brands).length} explicit title-brand identities; base catalog and prices unchanged`,
);
