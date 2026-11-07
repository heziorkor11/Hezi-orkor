import { useEffect, useRef, useState } from "react";
/** Handle both post-hydration errors and failures cached before hydration. No fake photo. */
export function CategoryImage({ src, className = "" }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  useEffect(() => {
    const image = ref.current;
    if (image?.complete && !image.naturalWidth) setFailed(true);
  }, [src]);
  if (!src || failed)
    return (
      <span
        className="flex h-14 items-center justify-center text-center text-xs text-muted"
        role="img"
        aria-label="תמונת קטגוריה אינה זמינה"
      >
        תמונה אינה זמינה
      </span>
    );
  return (
    <img
      ref={ref}
      src={src}
      alt=""
      width={160}
      height={100}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
