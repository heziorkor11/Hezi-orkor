import available from "./category-photo-assets.json";
// Bundled, fingerprinted URLs: no stale unversioned /catalog request after refresh.
const assets = import.meta.glob<string>("../assets/category-photos/*", {
  eager: true,
  query: "?url",
  import: "default",
});
export function categoryImage(id: string): string | undefined {
  const name = (available as Record<string, string | null>)[id];
  return name ? assets[`../assets/category-photos/${name}`] : undefined;
}
