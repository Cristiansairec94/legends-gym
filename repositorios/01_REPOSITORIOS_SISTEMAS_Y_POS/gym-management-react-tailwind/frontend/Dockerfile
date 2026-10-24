# ---- Stage 1: build the Vite app ----
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# API base URL baked at build time. Default "/api" => calls go same-origin
# and Nginx (below) proxies them to the backend container. No CORS needed.
ARG VITE_API_BASE_URL=/api
RUN printf "VITE_API_BASE_URL=%s\n" "$VITE_API_BASE_URL" > .env
RUN npm run build

# ---- Stage 2: serve static files with Nginx ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
