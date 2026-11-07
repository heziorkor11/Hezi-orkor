/** Build-only copies of existing real catalog photos. Never creates or deletes photos. */
import { readFile, mkdir, copyFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
const root = new URL("../", import.meta.url);
const { tiles } = JSON.parse(
  await readFile(new URL("public/catalog/category-photo-sources.json", root), "utf8"),
);
await mkdir(new URL("src/assets/category-photos/", root), { recursive: true });
const available = {};
for (const tile of tiles) {
  if (!/^\/catalog\/category-photos\/[a-z0-9-]+\.(jpg|webp|png)$/.test(tile.image))
    throw new Error("Invalid category photo path");
  const name = basename(tile.image);
  try {
    await copyFile(
      new URL("public" + tile.image, root),
      new URL("src/assets/category-photos/" + name, root),
    );
    available[tile.category] = name;
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    available[tile.category] = null;
    console.warn("Category photo missing; neutral placeholder:", tile.category, tile.image);
  }
}
await writeFile(
  new URL("src/lib/category-photo-assets.json", root),
  JSON.stringify(available, null, 2) + "\n",
);
console.log(
  "Category photos:",
  Object.values(available).filter(Boolean).length,
  "existing real assets;",
  Object.values(available).filter((v) => !v).length,
  "missing",
);
