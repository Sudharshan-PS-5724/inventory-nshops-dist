FROM node:24.19.0-bookworm-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci
COPY apps/api ./apps/api
RUN npm run api:build

FROM node:24.19.0-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --omit=dev
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
WORKDIR /workspace/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
