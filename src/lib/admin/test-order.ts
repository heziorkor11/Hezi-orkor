/** Detect sample / QA orders so the dashboard can hide them by default (never delete). */

export type TestOrderHint = {
  id?: string;
  source?: string;
  internalNotes?: string;
  customer?: { name?: string; notes?: string };
};

const LATIN_TEST = /(?:^|[^A-Za-z0-9])(?:TEST|E2E|QA)(?:$|[^A-Za-z0-9])/i;
const ID_TEST = /(?:TEST|E2E)/i;
const DEMO_HE = "דוגמה";

export function isTestOrder(order: TestOrderHint): boolean {
  const id = order.id || "";
  if (id && ID_TEST.test(id)) return true;

  const blob = [order.source, order.internalNotes, order.customer?.name, order.customer?.notes]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join(" ");
  if (!blob) return false;
  if (LATIN_TEST.test(blob)) return true;
  if (blob.includes(DEMO_HE)) return true;
  return false;
}
