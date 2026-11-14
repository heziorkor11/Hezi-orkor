import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ephemeralDir, gitCatalogEnabled } from "./config";
import { isValidGeneratedSku } from "./product-sku";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extensionForMime(mime: string): string | null {
  return TYPES[(mime || "").toLowerCase()] || null;
}

export function adminImageRelPath(sku: string, ext: string, bytes: Buffer): string {
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 8);
  return `public/catalog/admin-images/${sku}-${hash}.${ext}`;
}

export function isAllowedSkuForImage(sku: string) {
  return isValidGeneratedSku(sku) || /^HZ-[A-Z]+-\d{5}$/.test(sku);
}

export async function saveAdminImage(opts: { sku: string; bytes: Buffer; mime: string }) {
  if (!isAllowedSkuForImage(opts.sku)) throw new Error("מק״ט לא תקין");
  if (opts.bytes.length > 2 * 1024 * 1024) throw new Error("התמונה גדולה מ-2MB");
  const ext = extensionForMime(opts.mime);
  if (!ext) throw new Error("נתמכים רק JPEG, PNG ו-WebP");
  const rel = adminImageRelPath(opts.sku, ext, opts.bytes);
  const { isAllowedPublicBinaryPath } = await import("./git-catalog.server");
  if (!isAllowedPublicBinaryPath(rel)) throw new Error("נתיב התמונה אינו מותר");
  const abs = join(ephemeralDir(), rel.replaceAll("/", "__"));
  await mkdir(ephemeralDir(), { recursive: true });
  await writeFile(abs, opts.bytes);
  if (gitCatalogEnabled()) {
    const { commitPublicBinary } = await import("./git-catalog.server");
    await commitPublicBinary({ path: rel, bytes: opts.bytes, message: `chore(admin): product image ${opts.sku}` });
  }
  return { path: rel, publicUrl: `/api/catalog-image/${encodeURIComponent(opts.sku)}` };
}

export async function readEphemeralAdminImage(relPath: string): Promise<Buffer | null> {
  try {
    return await readFile(join(ephemeralDir(), relPath.replaceAll("/", "__")));
  } catch {
    return null;
  }
}

export async function loadImageBytesForSku(sku: string): Promise<{ bytes: Buffer; mime: string } | null> {
  const { readCatalogFile } = await import("./storage.server");
  const file = await readCatalogFile<{ bySku?: Record<string, string> }>("public/catalog/image-overrides.json", { bySku: {} });
  const stored = file.bySku?.[sku];
  // Prefer the latest ephemeral file for this SKU, regardless of stored path shape.
  const { readdir } = await import("node:fs/promises");
  const { ephemeralDir } = await import("./config");
  const dir = ephemeralDir();
  try {
    const names = await readdir(dir);
    const prefix = `public__catalog__admin-images__${sku}-`;
    const match = names.find((n) => n.startsWith(prefix));
    if (match) {
      const bytes = await readFile(join(dir, match));
      const ext = match.split(".").pop() || "jpg";
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      return { bytes, mime };
    }
  } catch {
    /* no ephemeral dir */
  }
  if (stored && stored.startsWith("public/catalog/admin-images/")) {
    const { readFile: rf } = await import("node:fs/promises");
    const { join: j } = await import("node:path");
    try {
      const bytes = await rf(j(process.cwd(), stored));
      const ext = stored.split(".").pop() || "jpg";
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      return { bytes, mime };
    } catch {
      return null;
    }
  }
  return null;
}
