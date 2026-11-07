/** Shared display/ranking policy. URLs are catalog metadata, not a live availability probe. */
export function hasRealProductImage(src?: string): boolean {
  return Boolean(
    src &&
    !/(?:placeholder|generic|no[-_]?image|no[-_]?photo|\/category-photos\/|\/images\/parts\/)/i.test(
      src,
    ),
  );
}
/** Stable partition: preserve catalog relevance/order inside each group; never mutate input. */
export function imagesFirst<T>(items: readonly T[], hasImage: (item: T) => boolean): T[] {
  const withImage: T[] = [],
    withoutImage: T[] = [];
  for (const item of items) (hasImage(item) ? withImage : withoutImage).push(item);
  return withImage.concat(withoutImage);
}
