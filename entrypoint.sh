#!/bin/sh -ex
export NODE_ENV=production
node build/scripts/migrate.mjs
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--import=./instrument.server.mjs"
exec ./node_modules/.bin/react-router-serve ./build/server/index.js
