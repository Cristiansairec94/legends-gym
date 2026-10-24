# ---- Backend: Node + Express API ----
FROM node:20-alpine

WORKDIR /app

# Install only production deps (nodemon is dev-only; we run `node server.js`)
COPY package*.json ./
RUN npm install --omit=dev

# App source
COPY . .

# uploads dir must exist and be writable for multer
RUN mkdir -p uploads

EXPOSE 5000
CMD ["npm", "start"]
