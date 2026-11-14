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
  "public/catalog/product-additions.json": "product-additions.json",
  "public/catalog/image-overrides.json": "image-overrides.json",
  "public/catalog/stock-overrides.json": "stock-overrides.json",
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

const ACTIVITY_EPHEMERAL = "admin/activity.json";

function activityPayload(entries: ActivityEntry[]): ActivityFile {
  return {
    version: 1,
    description: "Admin activity. Stored in the private data repo. No customer personal data.",
    entries,
  };
}

async function readBundledPublicActivity(): Promise<ActivityEntry[]> {
  try {
    const file = await catalogJson<ActivityFile>("admin-activity.json");
    return Array.isArray(file.entries) ? file.entries : [];
  } catch {
    return [];
  }
}

export async function readActivity(): Promise<ActivityEntry[]> {
  const ephemeral = await readEphemeral(ACTIVITY_EPHEMERAL);
  if (ephemeral) {
    try {
      const file = JSON.parse(ephemeral) as ActivityFile;
      if (Array.isArray(file.entries)) return file.entries;
    } catch {
      /* ignore */
    }
  }
  try {
    const { privateDataRepoReady, privateActivityPath, readPrivateFile } = await import("./git-private.server");
    if (await privateDataRepoReady()) {
      const file = await readPrivateFile(privateActivityPath());
      if (file?.content) {
        const data = JSON.parse(file.content) as ActivityFile;
        if (Array.isArray(data.entries)) {
          await writeEphemeral(ACTIVITY_EPHEMERAL, file.content);
          return data.entries;
        }
      }
    }
  } catch (err) {
    console.warn("[admin] private activity read failed", err instanceof Error ? err.message : err);
  }
  return readBundledPublicActivity();
}

async function persistActivity(entries: ActivityEntry[], message: string) {
  const text = JSON.stringify(activityPayload(entries), null, 2) + "\n";
  await writeEphemeral(ACTIVITY_EPHEMERAL, text);
  try {
    const { privateDataRepoReady, privateActivityPath, commitPrivateFile } = await import("./git-private.server");
    if (await privateDataRepoReady()) {
      await commitPrivateFile({ path: privateActivityPath(), content: text, message });
      return { committed: true, ephemeral: true as const };
    }
  } catch (err) {
    console.warn("[admin] private activity write failed", err instanceof Error ? err.message : err);
  }
  return { committed: false, ephemeral: true as const };
}

export async function appendActivity(entry: ActivityEntry, message: string) {
  const entries = [entry, ...(await readActivity())].slice(0, 500);
  return persistActivity(entries, message);
}

export async function saveActivityList(entries: ActivityEntry[], message: string) {
  return persistActivity(entries, message);
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
    additions,
    images,
    stock,
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
    readCatalogFile<{ bySku?: Record<string, import("./added-product").AddedProduct> }>(
      "public/catalog/product-additions.json",
      { bySku: {} },
    ),
    readCatalogFile<{ bySku?: Record<string, string> }>("public/catalog/image-overrides.json", { bySku: {} }),
    readCatalogFile<{ bySku?: Record<string, string> }>("public/catalog/stock-overrides.json", { bySku: {} }),
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
    additions: additions.bySku || {},
    imageBySku: images.bySku || {},
    stockBySku: stock.bySku || {},
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
