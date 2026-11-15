import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const TOP_MAPS = ["images-a.json", "images-b.json", "images-galor.json", "images-hot.json", "images-new.json"];

function mergeStringMap(maps: Record<string, string>, raw: unknown) {
  if (!raw || typeof raw !== "object") return;
  const rec = raw as Record<string, unknown>;
  if (rec.bySku && typeof rec.bySku === "object") mergeStringMap(maps, rec.bySku);
  for (const [key, value] of Object.entries(rec)) {
    if (typeof value === "string" && key.startsWith("HZ-")) maps[key] = value;
  }
}


function loadMapsFromDir(base: string): Record<string, string> {
  const maps: Record<string, string> = {};
  const load = (rel: string) => {
    const path = join(base, "public/catalog", rel);
    if (!existsSync(path)) return;
    const raw = readFileSync(path, "utf8").trim();
    if (!raw.startsWith("{")) return;
    mergeStringMap(maps, JSON.parse(raw));
  };
  for (const file of TOP_MAPS) load(file);
  const manifestPath = join(base, "public/catalog/images/manifest.json");
  if (existsSync(manifestPath)) {
    const pack = JSON.parse(readFileSync(manifestPath, "utf8")) as { files?: string[] };
    for (const file of pack.files || []) load(`images/${file}`);
  }
  const overridesPath = join(base, "public/catalog/image-overrides.json");
  if (existsSync(overridesPath)) {
    const raw = readFileSync(overridesPath, "utf8").trim();
    if (raw.startsWith("{")) mergeStringMap(maps, JSON.parse(raw));
  }
  return maps;
}

test("product image map files are unchanged versus origin/main", () => {
  const paths = [
    ...TOP_MAPS.map((f) => `public/catalog/${f}`),
    "public/catalog/images",
    "public/catalog/image-overrides.json",
    "public/catalog/category-photo-sources.json",
    "src/lib/catalog-listing.ts",
  ];
  const diff = execSync(`git diff --name-only origin/main -- ${paths.join(" ")}`, {
    cwd: root,
    encoding: "utf8",
  }).trim();
  assert.equal(diff, "", `image resolution files changed vs main:\n${diff}`);
});

test("resolved image URLs for every mapped SKU match origin/main", () => {
  const current = loadMapsFromDir(root);
  const mainTree = execSync("git rev-parse --verify origin/main", { cwd: root, encoding: "utf8" }).trim();
  assert.ok(mainTree);
  const tmp = execSync("mktemp -d", { encoding: "utf8" }).trim();
  try {
    execSync(`git archive origin/main -- public/catalog | tar -x -C ${tmp}`, { cwd: root });
    const mainMaps = loadMapsFromDir(tmp);
    assert.equal(Object.keys(current).length, Object.keys(mainMaps).length);
    const sample = [
      "HZ-CMP-00340",
      "HZ-CND-00004",
      "HZ-CND-00001",
      "HZ-FLT-00002",
      "HZ-BRK-00002",
      "HZ-OIL-00107",
      "HZ-PLUG-00016",
      "HZ-GEN-00380",
    ];
    for (const sku of sample) {
      assert.equal(current[sku], mainMaps[sku], sku);
    }
    for (const sku of Object.keys(mainMaps)) {
      assert.equal(current[sku], mainMaps[sku], `image URL changed for ${sku}`);
    }
  } finally {
    execSync(`rm -rf ${tmp}`);
  }
});
