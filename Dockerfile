# syntax=docker/dockerfile:1

# ---- deps: install once, shared by dev and build ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && chown -R node:node /app

# ---- dev: Vite dev server + admin (source is bind-mounted by compose) ----
FROM deps AS dev
USER node
COPY --chown=node:node . .
EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

# ---- build: static site in /app/dist (admin is not included) ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- prod: tiny nginx serving the built site ----
FROM nginx:1.27-alpine AS prod
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
