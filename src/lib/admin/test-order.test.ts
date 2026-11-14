import assert from "node:assert/strict";
import { test } from "node:test";
import { isTestOrder } from "./test-order.ts";

test("flags the production TEST E2E order id without treating regular ids as tests", () => {
  assert.equal(isTestOrder({ id: "HZ-ORD-TEST-E2E-20261113-2315" }), true);
  assert.equal(isTestOrder({ id: "HZ-ORD-20261113-1805" }), false);
  assert.equal(isTestOrder({ id: "HZ-ORD_430f1720256b6b7c" }), false);
});

test("flags demo-marked and explicit TEST names or notes", () => {
  assert.equal(isTestOrder({ id: "HZ-ORD-20261113-1805", customer: { name: "demo-customer (דוגמה)" } }), true);
  assert.equal(isTestOrder({ id: "HZ-ORD-1", customer: { name: "regular-customer" } }), false);
  assert.equal(isTestOrder({ id: "HZ-ORD-1", customer: { notes: "TEST cart checkout" } }), true);
  assert.equal(isTestOrder({ id: "HZ-ORD-1", internalNotes: "E2E probe, do not ship" }), true);
});

test("does not flag everyday customer names that are not sample marks", () => {
  assert.equal(isTestOrder({ id: "HZ-ORD-99", customer: { name: "David Cohen", notes: "call after 16:00" } }), false);
});
