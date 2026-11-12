# HZ-GEN-00023 browser-console investigation

Production deployment inspected: 6e8fa48 (dpl_CMH1BT3bw721nCxN15FxgLubryQa). Vercel runtime logs returned no records in the investigated window; they do not capture browser-console messages.

The real emitted handler returns HTTP 200 for /product/HZ-GEN-00023. This SKU has no product image and uses the neutral placeholder; its rendered related cards also use placeholders. The only image URLs in the inspected HTML are /brand/logo.jpg (header/footer) and /catalog/category-photos/workshop-packs.jpg; both files exist. Local compiled module-preload/script/style assets were checked separately. Old images-new-01..05 requests have already been removed from the image manifest in main.

A concrete remaining defect: loadImageMap still requested images-galor.json, whose entire content is PLACEHOLDER rather than JSON. Its parse error is swallowed by the optional-map fallback, so it is NOT proven to explain the reported five console errors. This PR removes only that invalid map reference, leaving the file and all source product/price data intact. A regression checks that every remaining base/manifest image-map request points to parseable JSON containing string mappings.

No speculative hydration patch, Vercel toolbar setting change, external script removal, console.error suppression, or placeholder image substitution was made. Header cart count and hours widget already defer client-dependent display until useEffect, avoiding an obvious SSR mismatch. The public Grok extension script is present, but there is no evidence attributing these errors to it or Vercel Live.

Exact five errors cannot be classified as harmless or fixed without their message/URL/stack or a real browser console capture. This executor has no approved browser tool; no browser-console/400px verification is claimed. Preview is for follow-up QA, not a production fix or merge.
