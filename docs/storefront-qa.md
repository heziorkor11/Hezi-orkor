# Storefront QA fixes (isolated from admin PR #9)

- Unknown category: explicit Hebrew state and metadata; no raw category name or oils empty-state copy; no unnecessary catalog fetch. Legacy oil/cabin category aliases remain normalized. HTTP 200 for an invalid query on the valid results route.
- Unknown paths: explicit catch-all with notFound() and root fallback, Hebrew page, noindex metadata and actual HTTP 404.
- Shared neutral ProductImage fallback in product, listing and related cards. Missing/known generic artwork is not requested; failed image loads switch to the same neutral icon/text. No generated images or source image edits.
- Display-only spacing for HZ-GEN-00005 and HZ-GEN-01392, restricted by SKU to avoid changing OE/part-number tokens elsewhere. No non-whitespace character changes. Raw catalog, prices, fitment/year/model fields, and HZ-GEN-00023/00025 remain unchanged.

Checks: npm run build; node --test scripts/storefront-qa.test.mjs; node scripts/check-storefront-qa.mjs (real emitted Vercel handler). Baseline main commit 952b047 also fails 16 existing template tests and the same unknown-error TypeScript check in error-component.tsx; these are not introduced here. Mobile browser screenshots and client-side image-error transitions still need browser QA; HTTP/SSR checks are not visual verification.
