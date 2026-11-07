/** Package immutable catalog JSON with the function, not a protected HTTP origin. */
import { readdir, mkdir, copyFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
const from = resolve("public/catalog");
const to = resolve(".vercel/output/functions/__server.func/catalog-data");
let count = 0;
async function copy(dir, rel = "") {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const key = join(rel, e.name);
    if (e.isDirectory()) await copy(join(dir, e.name), key);
    else if (e.isFile() && e.name.endsWith(".json")) {
      await mkdir(dirname(join(to, key)), { recursive: true });
      await copyFile(join(dir, e.name), join(to, key));
      count++;
    }
  }
}
await copy(from);
console.log(`Packaged ${count} immutable catalog JSON assets in the Vercel function`);
