# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

COPY shared ./shared
COPY backend ./backend

RUN cd backend \
  && npm run build \
  && npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/package.json ./package.json
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/shared ./shared
COPY --from=build /app/backend/src/schema ./src/schema
COPY --from=build /app/backend/migrations ./migrations

ENV PORT=4000
EXPOSE 4000

CMD ["sh", "-c", "node dist/backend/src/db/runMigrations.js && node dist/backend/src/index.js"]
