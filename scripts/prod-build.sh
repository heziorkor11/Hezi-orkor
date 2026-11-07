#!/bin/sh
set -e
node scripts/validate-catalog.mjs
node scripts/with-app-env.mjs vite build
node scripts/bundle-server-catalog.mjs
node scripts/check-storefront-catalog-readonly.mjs
npm run db:migrate
