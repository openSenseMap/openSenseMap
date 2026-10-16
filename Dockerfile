# syntax=docker/dockerfile:1

ARG NODE_VERSION=current

# base node image
FROM node:${NODE_VERSION}-slim AS base

# set for base and all layer that inherit from it
ENV NODE_ENV=production

# Update system and install some stuff
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init

# Install all node_modules, including dev dependencies
FROM base AS deps

WORKDIR /myapp

ADD package.json package-lock.json ./
RUN npm install --include=dev

# Setup production node_modules
FROM base AS production-deps

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
ADD package.json package-lock.json ./
RUN npm prune --omit=dev

# Build the app
FROM base AS build

WORKDIR /myapp

ARG COMMIT_SHA
ARG SENTRY_ORG
ARG SENTRY_PROJECT

ENV SENTRY_ORG=$SENTRY_ORG \
	SENTRY_PROJECT=$SENTRY_PROJECT \
	SENTRY_RELEASE=$COMMIT_SHA

COPY --from=deps /myapp/node_modules /myapp/node_modules
ADD . .

RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN,env=SENTRY_AUTH_TOKEN npm run build

# Finally, build the production image with minimal footprint
FROM base

WORKDIR /myapp

ARG COMMIT_SHA
ENV SENTRY_RELEASE=$COMMIT_SHA

COPY --from=production-deps /myapp/node_modules /myapp/node_modules
COPY --from=build /myapp/build /myapp/build

# Not sure if we really need this or if we should move all our /public folder to /app/assets
COPY --from=build /myapp/public /myapp/public

COPY ./entrypoint.sh /myapp/entrypoint.sh

ADD . .
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
