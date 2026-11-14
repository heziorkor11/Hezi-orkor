/**
 * Hook for a later Sheets/export worker.
 * No-ops unless SHEETS_SYNC_URL is set. When set, POSTs the change as JSON
 * with the shared-secret header SHEETS_SYNC_SECRET (from the env of the same name).
 * Never log the secret or the request headers.
 */
export type ProductChange = {
  action: "add" | "edit" | "price" | "image" | "tag" | "hide" | "stock" | "category" | "revert";
  sku?: string;
  at?: string;
  actor?: string;
  fields?: string[];
  hidden?: boolean;
};

export function sheetsHookConfigured(): boolean {
  return Boolean((process.env.SHEETS_SYNC_URL || "").trim());
}

function actionForFields(fields: string[]): ProductChange["action"] {
  if (fields.length === 1) {
    const only = fields[0];
    if (only === "price") return "price";
    if (only === "image") return "image";
    if (only === "tags") return "tag";
    if (only === "hidden") return "hide";
    if (only === "stock") return "stock";
    if (only === "category") return "category";
  }
  return "edit";
}

export function changeFromFields(fields: string[], rest: Omit<ProductChange, "action" | "fields"> = {}): ProductChange {
  return { ...rest, action: actionForFields(fields), fields };
}

export async function notifyProductChange(change: ProductChange): Promise<void> {
  const url = (process.env.SHEETS_SYNC_URL || "").trim();
  if (!url) return;
  const secret = (process.env.SHEETS_SYNC_SECRET || "").trim();
  const body = { ...change, at: change.at || new Date().toISOString() };
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (secret) headers.SHEETS_SYNC_SECRET = secret;
  try {
    await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.warn("[admin] product-change hook failed", err instanceof Error ? err.message : "error");
  }
}
