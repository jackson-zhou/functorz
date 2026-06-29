FROM node:24.14.0-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && TARO_H5_PUBLIC_PATH=/runtime/ pnpm --filter runtime build:h5
FROM nginx:1.27-alpine
COPY --from=build /app/apps/runtime/dist /usr/share/nginx/html
