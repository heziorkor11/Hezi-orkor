import assert from "node:assert/strict";
import { test } from "node:test";
import type { StoredOrder } from "./types.ts";
import { buildCustomerOrderMail, buildNewOrderMasterMail } from "./order-mail.ts";

function sample(plate?: string): StoredOrder {
  return {
    id: "HZ-ORD-TEST-MAIL",
    createdAt: "2026-11-15T16:00:00.000Z",
    status: "new",
    customer: {
      name: "בדיקה",
      phone: "0500000000",
      city: "נהריה",
      plate,
      make: plate ? "טויוטה" : undefined,
      model: plate ? "קורולה" : undefined,
      year: plate ? "2023" : undefined,
    },
    delivery: "pickup",
    lines: [{ sku: "HZ-CAF-00002", name: "פילטר", qty: 1, unitPrice: 10, lineTotal: 10 }],
    subtotal: 10,
    shipping: 0,
    total: 10,
    source: "whatsapp-cart",
  };
}

const URL = "https://example.test/admin/orders/HZ-ORD-TEST-MAIL";

test("master and customer mails omit the plate line when no plate was saved", () => {
  const order = sample();
  const master = buildNewOrderMasterMail(order, URL);
  const customer = buildCustomerOrderMail(order);
  assert.equal(master.text, `הזמנה חדשה ${order.id}\nבדיקה · 0500000000\nסה״כ 10\n${URL}`);
  assert.ok(!master.html.includes("מספר רכב"));
  assert.equal(customer.text, `קיבלנו את ההזמנה ${order.id}. מצורף PDF. סה״כ 10.`);
  assert.ok(!customer.html.includes("מספר רכב"));
});

test("master and customer mails include the combined plate line when present", () => {
  const order = sample("45773203");
  const master = buildNewOrderMasterMail(order, URL);
  const customer = buildCustomerOrderMail(order);
  const line = "מספר רכב: 457-73-203 · טויוטה קורולה 2023";
  assert.ok(master.text.includes(line));
  assert.ok(master.html.includes(line));
  assert.ok(customer.text.includes(line));
  assert.ok(customer.html.includes(line));
});
