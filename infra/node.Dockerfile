FROM node:24.14.0-slim AS build
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
WORKDIR /app
ARG APP
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter ${APP}... build
ENV APP=${APP}
CMD ["sh","-c","node apps/$APP/dist/index.js"]
