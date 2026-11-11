#!/bin/sh
set -e
node scripts/sync-category-photos.mjs
node scripts/validate-catalog.mjs
node scripts/with-app-env.mjs vite build
node scripts/bundle-server-catalog.mjs
node --test scripts/cart-links.test.mjs scripts/floating-images.test.mjs scripts/storefront-qa.test.mjs
node scripts/check-floating-images.mjs
node scripts/check-storefront-catalog-readonly.mjs
node scripts/check-storefront-qa.mjs
node scripts/check-cart-links.mjs
node scripts/check-hidden-products.mjs
node scripts/check-hidden-categories.mjs
node scripts/check-cleaning-maintenance.mjs
node scripts/check-matan-notes.mjs
node scripts/check-mobile-image-balance.mjs
node scripts/check-image-first.mjs
node scripts/check-listing-sort.mjs
npm run db:migrate

node scripts/check-image-first-client.mjs

node scripts/check-ac-product-photos.mjs

node scripts/check-ac-additional-photos.mjs

node scripts/check-ac-watermarked-photos.mjs

node scripts/check-all-ac-backgrounds.mjs

node scripts/check-wjs-approved-photos.mjs

node scripts/check-wjs-disc-batch-001.mjs

node scripts/check-wjs-design-only-002-004.mjs

node scripts/check-wjs-addendum-drawings.mjs

node scripts/check-wjs-batch-005-drawings.mjs

node scripts/check-wjs-batch-006.mjs

node scripts/check-wjs-batch-007.mjs

node scripts/check-wjs-batch-008.mjs

node scripts/check-wjs-batch-009.mjs

node scripts/check-wjs-batch-010.mjs

node scripts/check-wjs-batch-011.mjs

node scripts/check-wjs-batch-012.mjs

node scripts/check-autodoc-batch-a01.mjs
node scripts/check-ac-batch-001.mjs
node scripts/check-ac-batch-002.mjs
node scripts/check-ac-batch-a01.mjs

node scripts/check-ac-batch-005.mjs
