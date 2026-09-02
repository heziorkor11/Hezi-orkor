import { brand, type Product } from "@/lib/catalog";

export const SITE_NAME = `${brand.nameHe} | ${brand.name}`;

export function pageTitle(topic: string) {
  return `${topic} | ${brand.nameHe} | ${brand.city}`;
}

export function pageDescription(text: string) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 160) return trimmed;
  return trimmed.slice(0, 157).trimEnd() + "…";
}

export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: brand.nameHe,
    alternateName: brand.name,
    description: brand.taglineHe,
    url: "/",
    telephone: `+${brand.phoneTel}`,
    image: "/brand/logo.jpg",
    address: {
      "@type": "PostalAddress",
      streetAddress: brand.street,
      addressLocality: brand.city,
      addressCountry: "IL",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: brand.lat,
      longitude: brand.lng,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "08:00",
        closes: "17:00",
      },
    ],
    areaServed: ["נהריה", "הגליל המערבי", "עכו", "קריית שמונה"],
    priceRange: "₪₪",
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    inLanguage: "he",
    publisher: { "@type": "AutoPartsStore", name: brand.nameHe },
  };
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function productJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    mpn: product.oe.split(",")[0]?.trim() || product.sku,
    description: product.description,
    image: product.image || "/brand/logo.jpg",
    brand: { "@type": "Brand", name: brand.nameHe },
    offers: {
      "@type": "Offer",
      priceCurrency: "ILS",
      price: product.price,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "AutoPartsStore", name: brand.nameHe },
    },
  };
}

export function breadcrumbJsonLd(parts: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: parts.map((part, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: part.name,
      item: part.path,
    })),
  };
}
