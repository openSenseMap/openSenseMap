#!/bin/sh -ex
export NODE_ENV=production
node build/scripts/migrate.mjs
exec ./node_modules/.bin/react-router-serve ./build/server/index.js