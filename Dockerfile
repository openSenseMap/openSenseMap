FROM ghcr.io/voidzero-dev/vite-plus:latest AS build

WORKDIR /myapp

COPY --chown=vp:vp package.json package-lock.json .node-version* ./
RUN vp install --frozen-lockfile

COPY --chown=vp:vp . .
RUN vp run build

# Migration script needs to be compiled to js to be run at startup
RUN vp pack ./scripts/db/migrate.ts --out-dir build/scripts

RUN cp "$(vp env which node | head -1)" /tmp/node

FROM ghcr.io/voidzero-dev/vite-plus:latest AS deps

WORKDIR /myapp

COPY --chown=vp:vp package.json package-lock.json .node-version* ./
RUN vp install --frozen-lockfile --prod

FROM debian:bookworm-slim AS runtime

# Update system and install some stuff
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init

WORKDIR /myapp

ENV NODE_ENV=production

COPY --from=deps /myapp/node_modules /myapp/node_modules
COPY --from=build /tmp/node /usr/local/bin/node
COPY --from=build /myapp/build /myapp/build
COPY --from=build /myapp/build/scripts /myapp/build/scripts
COPY --from=build /myapp/package.json /myapp/package.json
COPY --from=build /myapp/public /myapp/public
COPY ./entrypoint.sh /myapp/entrypoint.sh

ADD . .
RUN chmod +x ./entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]