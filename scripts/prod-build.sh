#!/bin/sh
set -e
node scripts/validate-catalog.mjs
node scripts/with-app-env.mjs vite build
node scripts/bundle-server-catalog.mjs
node --test scripts/floating-images.test.mjs scripts/storefront-qa.test.mjs
node scripts/check-floating-images.mjs
node scripts/check-storefront-catalog-readonly.mjs
node scripts/check-storefront-qa.mjs
npm run db:migrate
