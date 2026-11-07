#!/bin/sh
set -e
node scripts/validate-catalog.mjs
node scripts/with-app-env.mjs vite build
node scripts/bundle-server-catalog.mjs
node --test scripts/floating-images.test.mjs
node scripts/check-floating-images.mjs
npm run db:migrate
