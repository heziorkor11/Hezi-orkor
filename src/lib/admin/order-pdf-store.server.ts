import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { adminDataRepo, ephemeralDir } from "./config";
import { githubRepoIsPrivate } from "./git-catalog.server";
import { getOrder, saveOrder } from "./orders.server";

function localPdfPath(orderId: string) {
  const safe = String(orderId).replace(/[^A-Za-z0-9_-]/g, "");
  return join(ephemeralDir(), "pdfs", `${safe}.pdf`);
}

export async function storeOrderPdf(orderId: string, bytes: Buffer, actor?: { id: string; name: string }) {
  if (bytes.length < 8 || bytes.subarray(0, 5).toString("utf8") !== "%PDF-") {
    throw new Error("הקובץ אינו PDF תקין");
  }
  if (bytes.length > 6 * 1024 * 1024) throw new Error("קובץ ה-PDF גדול מדי");
  const dir = join(ephemeralDir(), "pdfs");
  await mkdir(dir, { recursive: true });
  await writeFile(localPdfPath(orderId), bytes);
  const dataRepo = adminDataRepo();
  if (dataRepo && (await githubRepoIsPrivate(dataRepo)) === true) {
    const { privateOrderPdfPath, commitPrivateBinary } = await import("./git-private.server");
    await commitPrivateBinary({
      path: privateOrderPdfPath(orderId),
      bytes,
      message: `chore(admin): store order PDF ${orderId}`,
    });
  }
  const order = await getOrder(orderId);
  if (order) {
    const at = new Date().toISOString();
    const events = [
      ...(order.events || []),
      {
        at,
        by: actor?.id || "system",
        byName: actor?.name || "האתר",
        type: "pdf" as const,
        detail: "קובץ PDF נשמר במאגר הפרטי",
      },
    ];
    await saveOrder({ ...order, pdfStored: true, events });
  }
}

export async function readOrderPdf(orderId: string): Promise<Buffer | null> {
  try {
    return await readFile(localPdfPath(orderId));
  } catch {
    /* miss */
  }
  const dataRepo = adminDataRepo();
  if (!dataRepo) return null;
  try {
    if ((await githubRepoIsPrivate(dataRepo)) !== true) return null;
    const { privateOrderPdfPath, readPrivateBinary } = await import("./git-private.server");
    const file = await readPrivateBinary(privateOrderPdfPath(orderId));
    if (!file) return null;
    const dir = join(ephemeralDir(), "pdfs");
    await mkdir(dir, { recursive: true });
    await writeFile(localPdfPath(orderId), file.bytes);
    return file.bytes;
  } catch {
    return null;
  }
}
