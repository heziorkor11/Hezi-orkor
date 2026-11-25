import test from "node:test";
import assert from "node:assert/strict";
import {
  bundleCartAdds,
  bundleTotal,
  isWinterPromoActive,
  promoCountdown,
  visibleWinterBundles,
  winterBundlesForSku,
  winterPromo,
  type WinterPromoConfig,
} from "./winter-bundles.ts";
import { catalogPrice } from "./prices.ts";
import { summarizeCart } from "./cart-pricing.ts";

const during = new Date("2026-11-26T12:00:00+02:00");
const cfg: WinterPromoConfig = winterPromo;

test("config: exactly 3 bundles with the agreed SKUs", () => {
  assert.equal(cfg.bundles.length, 3);
  assert.deepEqual(
    cfg.bundles.map((b) => b.items.map((i) => i.sku)),
    [
      ["HZ-OIL-00108", "HZ-OILF-00087", "HZ-FLT-00201"],
      ["HZ-OIL-00110", "HZ-OILF-00091", "HZ-FLT-00217", "HZ-CAF-00090"],
      ["HZ-OILF-00010", "HZ-FLT-00015", "HZ-CAF-00010", "HZ-FLT-00558"],
    ],
  );
  for (const b of cfg.bundles) for (const i of b.items) assert.equal(i.qty, 1);
});

test("config: no discount wording anywhere", () => {
  const { description: _ignored, ...shown } = cfg as WinterPromoConfig & { description?: string };
  const text = JSON.stringify(shown);
  for (const banned of ["במקום", "הנחה", "חוסכים", "%", "מבצע"]) {
    assert.equal(text.includes(banned), false, `banned word: ${banned}`);
  }
});

test("bundle total = live sum of current site prices (245 / 275 / 188 today)", () => {
  const totals = cfg.bundles.map((b) => bundleTotal(b));
  assert.deepEqual(totals, [245, 275, 188]);
  for (const b of cfg.bundles) {
    const manual = b.items.reduce((s, i) => s + (catalogPrice(i.sku) as number) * i.qty, 0);
    assert.equal(bundleTotal(b), manual);
  }
});

test("bundle total follows price changes (not hard-coded)", () => {
  const b = cfg.bundles[0];
  const bumped = bundleTotal(b, (sku) => (sku === "HZ-FLT-00201" ? 100 : catalogPrice(sku)));
  assert.equal(bumped, 245 - 29 + 100);
});

test("bundle hidden when any item has no price", () => {
  const b = cfg.bundles[1];
  assert.equal(
    bundleTotal(b, (sku) => (sku === "HZ-CAF-00090" ? null : catalogPrice(sku))),
    null,
  );
  const vis = visibleWinterBundles(during, cfg, (sku) =>
    sku === "HZ-CAF-00090" ? null : catalogPrice(sku),
  );
  assert.deepEqual(
    vis.map((x) => x.id),
    ["corolla-2008-2016", "dmax-2012-2016"],
  );
});

test("cart after adding a bundle totals exactly the bundle price", () => {
  for (const b of cfg.bundles) {
    const lines = bundleCartAdds(b);
    const { subtotal, quoteCount } = summarizeCart(lines, catalogPrice);
    assert.equal(quoteCount, 0);
    assert.equal(subtotal, bundleTotal(b));
  }
});

test("schedule: active window and auto-off after 27.11.2026 23:59 Israel", () => {
  assert.equal(isWinterPromoActive(during, cfg), true);
  assert.equal(isWinterPromoActive(new Date("2026-11-27T23:59:00+02:00"), cfg), true);
  assert.equal(isWinterPromoActive(new Date("2026-11-28T00:00:00+02:00"), cfg), false);
  assert.equal(isWinterPromoActive(new Date("2026-11-24T23:59:00+02:00"), cfg), false);
  assert.equal(visibleWinterBundles(new Date("2026-11-28T00:00:01+02:00"), cfg).length, 0);
});

test("schedule: enabled=false turns everything off", () => {
  const off = { ...cfg, enabled: false };
  assert.equal(isWinterPromoActive(during, off), false);
  assert.equal(winterBundlesForSku("HZ-OIL-00108", during, off).length, 0);
});

test("schedule: bad dates fail closed", () => {
  assert.equal(isWinterPromoActive(during, { ...cfg, endAt: "nope" }), false);
});

test("badge lookup by SKU", () => {
  assert.deepEqual(
    winterBundlesForSku("HZ-CAF-00010", during, cfg).map((b) => b.id),
    ["dmax-2012-2016"],
  );
  assert.equal(winterBundlesForSku("HZ-CAF-00084", during, cfg).length, 0);
  assert.equal(winterBundlesForSku(undefined, during, cfg).length, 0);
});

test("countdown to end of Friday", () => {
  const c = promoCountdown(new Date("2026-11-25T23:59:59+02:00"), cfg);
  assert.deepEqual(
    { d: c.days, h: c.hours, m: c.minutes, e: c.expired },
    { d: 2, h: 0, m: 0, e: false },
  );
  assert.equal(promoCountdown(new Date("2026-11-28T00:00:00+02:00"), cfg).expired, true);
});

test("WhatsApp order text after adding a bundle shows the same subtotal", async () => {
  const { buildOrderShareMessage, emptyOrderCustomer } = await import("./order-quote.ts");
  for (const b of cfg.bundles) {
    const lines = bundleCartAdds(b).map((l) => ({ sku: l.sku, name: l.sku, qty: l.qty }));
    const { subtotal } = summarizeCart(lines, catalogPrice);
    const { text } = buildOrderShareMessage({
      orderRef: "HZ-ORD-TEST",
      customer: { ...emptyOrderCustomer(), name: "בדיקה", phone: "0521234567", plate: "1234567" },
      lines,
      subtotal,
    });
    assert.ok(text.includes(`סכום ביניים: ${bundleTotal(b)} ₪`), text);
  }
});
