FROM node:24.14.0-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter studio build
FROM nginx:1.27-alpine
COPY --from=build /app/apps/studio/dist /usr/share/nginx/html
