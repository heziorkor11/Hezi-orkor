import { getProductTags } from "@/lib/product-tags";

/** One tag: top-right. Two tags: mirrored top-right + top-left. */
export function ProductTagBadges({ sku }: { sku: string }) {
  const tags = getProductTags(sku);
  if (!tags.length) return null;
  return (
    <>
      {tags.map((tag, i) => (
        <span
          key={tag.id}
          className={`product-img-tag ${i === 0 ? "tr" : "tl"}`}
          style={{ background: tag.color }}
        >
          {tag.label}
        </span>
      ))}
    </>
  );
}
