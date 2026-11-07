import { useState } from "react";
import { ImageOff } from "lucide-react";
/** No representative/AI artwork is substituted for an unavailable product photo. */
export function ProductImage({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState<string>();
  const usable =
    src && src !== failed && !/(?:placeholder|\/category-photos\/|\/images\/parts\/)/i.test(src);
  return usable ? (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(src)}
    />
  ) : (
    <div
      data-product-placeholder
      className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-muted"
      role="img"
      aria-label="תמונת מוצר אינה זמינה"
    >
      <ImageOff size={36} strokeWidth={1.4} aria-hidden="true" />
      <span className="text-xs">תמונה תתווסף בקרוב</span>
    </div>
  );
}
