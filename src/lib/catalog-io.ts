/** Read public/catalog JSON without crashing SSR on Vercel. */

function originCandidates(): string[] {
  const out: string[] = [];
  const envOrigin =
    typeof process !== "undefined" ? process.env.CATALOG_ORIGIN || process.env.VITE_SITE_ORIGIN || "" : "";
  if (envOrigin) out.push(String(envOrigin).replace(/\/$/, ""));
  out.push("https://hezi-orkor.vercel.app");
  const vercel = typeof process !== "undefined" ? process.env.VERCEL_URL || "" : "";
  if (vercel) {
    const host = String(vercel).replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (host && !out.some((o) => o.includes(host))) out.push(`https://${host}`);
  }
  return out;
}

export function catalogUrl(rel: string, origin?: string) {
  if (typeof window !== "undefined") return `/catalog/${rel}`;
  const base = origin || originCandidates()[0] || "https://hezi-orkor.vercel.app";
  return `${String(base).replace(/\/$/, "")}/catalog/${rel}`;
}

export async function readCatalogText(rel: string): Promise<string> {
  if (typeof window === "undefined") {
    try {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const cwd = typeof process !== "undefined" ? process.cwd() : ".";
      const candidates = [
        join(cwd, "public", "catalog", rel),
        join(cwd, ".output", "public", "catalog", rel),
        join(cwd, ".vercel", "output", "static", "catalog", rel),
        join(cwd, "catalog", rel),
      ];
      for (const path of candidates) {
        try {
          return await readFile(path, "utf8");
        } catch {
          /* next path */
        }
      }
    } catch {
      /* fall through to fetch */
    }

    const errors: string[] = [];
    for (const origin of originCandidates()) {
      try {
        const res = await fetch(catalogUrl(rel, origin), { cache: "no-store" });
        if (res.ok) return await res.text();
        errors.push(`${origin}:${res.status}`);
      } catch (err) {
        errors.push(`${origin}:${err instanceof Error ? err.message : "fail"}`);
      }
    }
    throw new Error(`Failed to load catalog ${rel} (${errors.join("; ") || "no source"})`);
  }

  const res = await fetch(catalogUrl(rel));
  if (!res.ok) throw new Error(`Failed to load catalog ${rel} (${res.status})`);
  return await res.text();
}

export async function catalogJson<T>(rel: string): Promise<T> {
  return JSON.parse(await readCatalogText(rel)) as T;
}
