/**
 * Generate sample order PDFs (3-item + 12-item) for visual QA.
 * Run: node --experimental-strip-types scripts/generate-order-pdf-samples.mjs
 * Or via tsx/vite-node if available.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = process.env.ORDER_PDF_OUT || "/workspace/designs/order";
mkdirSync(outDir, { recursive: true });

// Load catalog products for sample SKUs
const skuMap = JSON.parse(readFileSync(join(root, "public/catalog/sku-map.json"), "utf8"));
const chunkCache = new Map();
function loadProduct(sku) {
  const chunkId = skuMap[sku];
  if (chunkId == null) throw new Error(`SKU not in map: ${sku}`);
  const key = String(chunkId).padStart(2, "0");
  if (!chunkCache.has(key)) {
    chunkCache.set(key, JSON.parse(readFileSync(join(root, `public/catalog/chunks/${key}.json`), "utf8")));
  }
  const p = chunkCache.get(key).find((x) => x.sku === sku);
  if (!p) throw new Error(`SKU not in chunk: ${sku}`);
  return p;
}

const customer = {
  name: "ישראל כהן",
  phone: "052-1234567",
  city: "נהריה",
  delivery: "pickup",
  plate: "1234567",
  make: "טויוטה",
  model: "קורולה",
  year: "2012",
  engine: "1.6",
  notes: "לאשר התאמה לפי מספר רכב לפני שליחה",
};

const skus3 = ["HZ-GEN-00266", "HZ-OILF-00087", "HZ-GEN-04954"];
const skus12 = [
  "HZ-GEN-00266",
  "HZ-OILF-00087",
  "HZ-GEN-04954",
  "HZ-GEN-00001",
  "HZ-GEN-00002",
  "HZ-GEN-00003",
  "HZ-GEN-00353",
  "HZ-GEN-03387",
  "HZ-OILF-00001",
  "HZ-OILF-00002",
  "HZ-GEN-01000",
  "HZ-GEN-00004",
];

function linesFor(skus) {
  return skus.map((sku, i) => {
    const p = loadProduct(sku);
    return { sku: p.sku, name: p.name, qty: i === 1 ? 2 : 1, oe: p.oe };
  });
}

// Dynamic import of compiled-ish TS via vite-node alternative: use jspdf directly here
// by importing the built module through node strip-types from src.
const orderPdfUrl = pathToFileURL(join(root, "src/lib/order-pdf.ts")).href;

async function main() {
  // Register path alias @/ → src/ for strip-types imports is hard; instead call jspdf inline
  // by spawning a small vite-ssr load if available, else duplicate via dynamic import with aliases.
  const require = createRequire(import.meta.url);

  // Use vite to load TS with aliases
  const { createServer } = await import("vite");
  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    root,
  });
  try {
    const mod = await server.ssrLoadModule("/src/lib/order-pdf.ts");
    const fontRegular = readFileSync(join(root, "public/fonts/Heebo-Regular.ttf"));
    const fontBold = readFileSync(join(root, "public/fonts/Heebo-Bold.ttf"));
    let logoDataUrl = null;
    try {
      const logo = readFileSync(join(root, "public/brand/logo.jpg"));
      logoDataUrl = `data:image/jpeg;base64,${logo.toString("base64")}`;
    } catch {}
    mod.setOrderPdfAssetsFromBytes({ fontRegular, fontBold, logoDataUrl });

    const now = new Date("2026-11-07T00:21:00+02:00");

    for (const [name, skus] of [
      ["pdf-3items.pdf", skus3],
      ["pdf-12items.pdf", skus12],
    ]) {
      const { blob, orderRef, subtotal, quoteCount } = await mod.buildOrderPdfBlob({
        customer,
        lines: linesFor(skus),
        now,
        orderRef: name.includes("3") ? "HZ-ORD-20261107-0021" : "HZ-ORD-20261107-0022",
      });
      const buf = Buffer.from(await blob.arrayBuffer());
      const out = join(outDir, name);
      writeFileSync(out, buf);
      console.log(JSON.stringify({ file: out, bytes: buf.length, orderRef, subtotal, quoteCount, items: skus.length }));
    }
  } finally {
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
