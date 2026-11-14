import { SignJWT, importPKCS8 } from "jose";
import { PRODUCT_SHEET_HEADERS, sheetRowToArray, type ProductSheetRow } from "./product-sheet";

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
  token_uri?: string;
};

function sheetId() {
  const preview = (process.env.GOOGLE_PRODUCTS_SHEET_ID_PREVIEW || "").trim();
  if (process.env.VERCEL_ENV !== "production" && preview) return preview;
  return (process.env.GOOGLE_PRODUCTS_SHEET_ID || "").trim();
}

function parseServiceAccount(): ServiceAccount | null {
  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

export function sheetsSyncConfigured() {
  return Boolean(sheetId() && parseServiceAccount()?.client_email && parseServiceAccount()?.private_key);
}

async function accessToken(): Promise<string> {
  const sa = parseServiceAccount();
  if (!sa?.client_email || !sa.private_key) throw new Error("חשבון השירות של Google לא הוגדר");
  const key = sa.private_key.replace(/\\n/g, "\n");
  const pk = await importPKCS8(key, "RS256");
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/spreadsheets",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(sa.token_uri || "https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(pk);
  const res = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error("לא ניתן לקבל אסימון ל-Google Sheets");
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("לא ניתן לקבל אסימון ל-Google Sheets");
  return data.access_token;
}

async function sheetsFetch(path: string, init?: RequestInit) {
  const token = await accessToken();
  const id = sheetId();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`עדכון Google Sheets נכשל (${res.status})`);
  }
  return res.json();
}

export async function fullResyncSheet(rows: ProductSheetRow[]): Promise<{ ok: true; rows: number } | { ok: false; reason: string }> {
  if (!sheetsSyncConfigured()) return { ok: false, reason: "not-configured" };
  try {
    const values = [PRODUCT_SHEET_HEADERS, ...rows.map(sheetRowToArray)];
    await sheetsFetch("/values/מוצרים!A1:N?valueInputOption=RAW", {
      method: "PUT",
      body: JSON.stringify({ range: "מוצרים!A1:N", majorDimension: "ROWS", values }),
    });
    return { ok: true, rows: rows.length };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "sheets-error" };
  }
}

export async function upsertSheetRow(row: ProductSheetRow): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!sheetsSyncConfigured()) return { ok: false, reason: "not-configured" };
  try {
    const data = (await sheetsFetch("/values/מוצרים!A:A?majorDimension=COLUMNS")) as {
      values?: string[][];
    };
    const col = data.values?.[0] || [];
    const idx = col.findIndex((v, i) => i > 0 && v === row.sku);
    const values = [sheetRowToArray(row)];
    if (idx >= 1) {
      const r = idx + 1;
      await sheetsFetch(`/values/מוצרים!A${r}:N${r}?valueInputOption=RAW`, {
        method: "PUT",
        body: JSON.stringify({ range: `מוצרים!A${r}:N${r}`, majorDimension: "ROWS", values }),
      });
    } else {
      await sheetsFetch("/values/מוצרים!A1:N1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", {
        method: "POST",
        body: JSON.stringify({ values }),
      });
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "sheets-error" };
  }
}
