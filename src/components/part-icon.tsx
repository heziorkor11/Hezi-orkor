import type { PartTypeId } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Props = {
  type: PartTypeId;
  className?: string;
  size?: number;
};

export function PartIcon({ type, className, size = 88 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 88 88"
      fill="none"
      className={cn("text-accent-hot", className)}
      aria-hidden="true"
    >
      {paths(type)}
    </svg>
  );
}

function paths(type: PartTypeId) {
  const stroke = "currentColor";
  switch (type) {
    case "headlight":
      return (
        <>
          <path
            d="M18 46c8-18 22-26 36-26 10 0 16 8 16 18 0 14-10 24-26 24-16 0-24-6-26-16Z"
            stroke={stroke}
            strokeWidth="2.2"
          />
          <path d="M34 36c8-4 18-4 26 2" stroke={stroke} strokeWidth="1.6" opacity="0.7" />
          <path d="M70 38l10-4M70 46l10 0M70 54l10 4" stroke={stroke} strokeWidth="1.8" />
          <circle cx="42" cy="46" r="8" stroke={stroke} strokeWidth="1.8" />
        </>
      );
    case "taillight":
      return (
        <>
          <rect x="20" y="28" width="48" height="32" rx="10" stroke={stroke} strokeWidth="2.2" />
          <rect x="28" y="36" width="16" height="16" rx="3" stroke={stroke} strokeWidth="1.6" />
          <path d="M50 36h12M50 44h12M50 52h8" stroke={stroke} strokeWidth="1.8" />
        </>
      );
    case "foglight":
      return (
        <>
          <circle cx="40" cy="44" r="16" stroke={stroke} strokeWidth="2.2" />
          <circle cx="40" cy="44" r="6" stroke={stroke} strokeWidth="1.6" />
          <path d="M58 36h14M58 44h16M58 52h14" stroke={stroke} strokeWidth="1.8" />
        </>
      );
    case "mirror":
      return (
        <>
          <rect x="22" y="22" width="36" height="44" rx="12" stroke={stroke} strokeWidth="2.2" />
          <rect x="28" y="28" width="24" height="28" rx="6" stroke={stroke} strokeWidth="1.6" />
          <path d="M58 40h12c4 0 6 3 6 7v6" stroke={stroke} strokeWidth="2" />
        </>
      );
    case "compressor":
      return (
        <>
          <rect x="22" y="30" width="36" height="32" rx="4" stroke={stroke} strokeWidth="2.2" />
          <circle cx="40" cy="46" r="10" stroke={stroke} strokeWidth="1.8" />
          <path d="M58 38h10v16H58M28 30V22h20v8" stroke={stroke} strokeWidth="1.8" />
        </>
      );
    case "condenser":
      return (
        <>
          <rect x="20" y="24" width="48" height="40" rx="3" stroke={stroke} strokeWidth="2.2" />
          {Array.from({ length: 7 }).map((_, i) => (
            <path
              key={i}
              d={`M26 ${30 + i * 4.5}h36`}
              stroke={stroke}
              strokeWidth="1.4"
              opacity="0.8"
            />
          ))}
        </>
      );
    case "radiator":
      return (
        <>
          <rect x="18" y="26" width="52" height="36" rx="3" stroke={stroke} strokeWidth="2.2" />
          <path d="M26 26v36M62 26v36" stroke={stroke} strokeWidth="1.8" />
          {Array.from({ length: 5 }).map((_, i) => (
            <path key={i} d={`M30 ${34 + i * 5}h28`} stroke={stroke} strokeWidth="1.5" />
          ))}
        </>
      );
    case "shock":
      return (
        <>
          <rect x="38" y="12" width="12" height="18" rx="2" stroke={stroke} strokeWidth="2" />
          <path d="M32 30h24v8H32zM36 38l-6 22h28l-6-22" stroke={stroke} strokeWidth="2" />
          <path d="M40 46h8M38 54h12" stroke={stroke} strokeWidth="1.6" />
        </>
      );
    case "sensor":
      return (
        <>
          <rect x="30" y="18" width="28" height="22" rx="4" stroke={stroke} strokeWidth="2.2" />
          <circle cx="44" cy="29" r="6" stroke={stroke} strokeWidth="1.8" />
          <path d="M44 40v22M36 54h16" stroke={stroke} strokeWidth="2" />
        </>
      );
    case "fender":
      return (
        <>
          <path
            d="M16 54c8-2 14-16 22-16 4 0 6 4 12 4 10 0 18-10 26-10 0 12-2 22-8 28H22c-4 0-6-2-6-6Z"
            stroke={stroke}
            strokeWidth="2.2"
          />
          <circle cx="34" cy="58" r="8" stroke={stroke} strokeWidth="1.8" />
        </>
      );
    case "bumper":
      return (
        <>
          <path
            d="M14 40c18 12 42 12 60 0"
            stroke={stroke}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path d="M22 48h8M58 48h8" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "battery":
      return (
        <>
          <rect x="20" y="30" width="48" height="32" rx="4" stroke={stroke} strokeWidth="2.2" />
          <path d="M32 30V24h8v6M48 30V24h8v6" stroke={stroke} strokeWidth="1.8" />
          <path d="M34 46h8M38 42v8M50 46h8" stroke={stroke} strokeWidth="2" />
        </>
      );
    default:
      return (
        <>
          <rect x="24" y="28" width="40" height="36" rx="4" stroke={stroke} strokeWidth="2.2" />
          <path d="M32 40h24M32 48h16" stroke={stroke} strokeWidth="1.8" />
        </>
      );
  }
}
