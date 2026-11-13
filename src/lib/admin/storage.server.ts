import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { catalogJson } from "@/lib/catalog-io";
import { adminMode, ephemeralDir, gitCatalogEnabled } from "./config";
import { mergeOverlay } from "./public-overlay";
import type {
  ActivityEntry,
  ActivityFile,
  HomeDealsFile,
  ProductTagsFile,
  PublicOverlay,
  PublicGitPath,
  TagLibraryFile,
} from "./types";
import { PUBLIC_GIT_PATHS } from "./types";

export { PUBLIC_GIT_PATHS };

function isPublicPath(path: string): path is PublicGitPath {
  return (PUBLIC_GIT_PATHS as readonly string[]).includes(path);
}

function ephemeralPath(rel: string) {
  return join(ephemeralDir(), rel.replaceAll("/", "__"));
}

async function readEphemeral(rel: string): Promise<string | null> {
  try {
    return await readFile(ephemeralPath(rel), "utf8");
  } catch {
    return null;
  }
}

async function writeEphemeral(rel: string, text: string) {
  const dir = ephemeralDir();
  await mkdir(dir, { recursive: true });
  await writeFile(ephemeralPath(rel), text, "utf8");
}

const catalogName: Record<string, string> = {
  "public/catalog/price-overrides.json": "price-overrides.json",
  "public/catalog/price-hide-overrides.json": "price-hide-overrides.json",
  "public/catalog/name-overrides.json": "name-overrides.json",
  "public/catalog/visibility-overrides.json": "visibility-overrides.json",
  "public/catalog/display-category-overrides.json": "display-category-overrides.json",
  "public/catalog/hidden-categories.json": "hidden-categories.json",
  "public/catalog/tag-library.json": "tag-library.json",
  "public/catalog/product-tags.json": "product-tags.json",
  "public/catalog/home-deals-overrides.json": "home-deals-overrides.json",
  "public/catalog/admin-activity.json": "admin-activity.json",
  "public/catalog/category-label-overrides.json": "category-label-overrides.json",
  "public/catalog/category-order-overrides.json": "category-order-overrides.json",
};

export async function readCatalogFile<T>(path: PublicGitPath, fallback: T): Promise<T> {
  const ephemeral = await readEphemeral(path);
  if (ephemeral) {
    try {
      return JSON.parse(ephemeral) as T;
    } catch {
      /* ignore corrupt ephemeral */
    }
  }
  const name = catalogName[path];
  if (!name) return fallback;
  try {
    return await catalogJson<T>(name);
  } catch {
    return fallback;
  }
}

export async function writeCatalogFile(opts: {
  path: string;
  data: unknown;
  message: string;
}): Promise<{ committed: boolean; ephemeral: true }> {
  if (!isPublicPath(opts.path)) {
    throw new Error("Refusing to write a non-allowlisted catalog path");
  }
  const text = `${JSON.stringify(opts.data, null, 2)}\n`;
  await writeEphemeral(opts.path, text);
  await refreshOverlayFromDisk();
  let committed = false;
  if (gitCatalogEnabled()) {
    const { commitPublicFile } = await import("./git-catalog.server");
    committed = await commitPublicFile({ path: opts.path, content: text, message: opts.message });
  }
  return { committed, ephemeral: true };
}

export async function readActivity(): Promise<ActivityEntry[]> {
  const file = await readCatalogFile<ActivityFile>("public/catalog/admin-activity.json", {
    version: 1,
    entries: [],
  });
  return Array.isArray(file.entries) ? file.entries : [];
}

export async function appendActivity(entry: ActivityEntry, message: string) {
  const entries = [entry, ...(await readActivity())].slice(0, 500);
  return writeCatalogFile({
    path: "public/catalog/admin-activity.json",
    data: { version: 1, description: "Catalog-change activity only. No customer personal data.", entries },
    message,
  });
}

export async function saveActivityList(entries: ActivityEntry[], message: string) {
  return writeCatalogFile({
    path: "public/catalog/admin-activity.json",
    data: { version: 1, description: "Catalog-change activity only. No customer personal data.", entries },
    message,
  });
}

export async function buildPublicOverlay(): Promise<PublicOverlay> {
  const [
    prices,
    hide,
    names,
    visibility,
    catOverrides,
    hiddenCats,
    tags,
    productTags,
    deals,
    labels,
    order,
  ] = await Promise.all([
    readCatalogFile<{ bySku?: Record<string, number> }>("public/catalog/price-overrides.json", { bySku: {} }),
    readCatalogFile<{ skus?: string[] }>("public/catalog/price-hide-overrides.json", { skus: [] }),
    readCatalogFile<{ bySku?: Record<string, string> }>("public/catalog/name-overrides.json", { bySku: {} }),
    readCatalogFile<{ bySku?: Record<string, { hidden?: boolean }> }>("public/catalog/visibility-overrides.json", {
      bySku: {},
    }),
    readCatalogFile<{ bySku?: Record<string, { category?: string }> }>(
      "public/catalog/display-category-overrides.json",
      { bySku: {} },
    ),
    readCatalogFile<{ hiddenCategories?: string[] }>("public/catalog/hidden-categories.json", {
      hiddenCategories: ["lights", "small-engine"],
    }),
    readCatalogFile<TagLibraryFile>("public/catalog/tag-library.json", { version: 1, tags: [] }),
    readCatalogFile<ProductTagsFile>("public/catalog/product-tags.json", { version: 1, bySku: {} }),
    readCatalogFile<HomeDealsFile>("public/catalog/home-deals-overrides.json", { version: 1, skus: [] }),
    readCatalogFile<{ byId?: Record<string, string> }>("public/catalog/category-label-overrides.json", { byId: {} }),
    readCatalogFile<{ ids?: string[] }>("public/catalog/category-order-overrides.json", { ids: [] }),
  ]);
  const hiddenSkus: Record<string, boolean> = {};
  for (const [sku, v] of Object.entries(visibility.bySku || {})) {
    if (typeof v?.hidden === "boolean") hiddenSkus[sku] = v.hidden;
  }
  const categoryBySku: Record<string, string> = {};
  for (const [sku, v] of Object.entries(catOverrides.bySku || {})) {
    if (v?.category) categoryBySku[sku] = v.category;
  }
  return {
    priceBySku: prices.bySku || {},
    priceHideSkus: hide.skus || [],
    nameBySku: names.bySku || {},
    hiddenSkus,
    hiddenCategories: hiddenCats.hiddenCategories || ["lights", "small-engine"],
    categoryLabels: labels.byId || {},
    categoryOrder: order.ids || [],
    categoryBySku,
    tagLibrary: tags.tags || [],
    productTags: productTags.bySku || {},
    homeDeals: deals.skus || [],
  };
}

export async function refreshOverlayFromDisk() {
  if (adminMode() === "disabled") return;
  try {
    mergeOverlay(await buildPublicOverlay());
  } catch (err) {
    console.warn("[admin] overlay refresh failed", err instanceof Error ? err.message : err);
  }
}

let booted = false;
export async function ensureAdminOverlay() {
  if (booted) return;
  booted = true;
  await refreshOverlayFromDisk();
}
