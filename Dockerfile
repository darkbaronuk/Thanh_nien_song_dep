FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-bookworm-slim
ENV NODE_ENV=production
ENV DATA_DIR=/data
# LibreOffice để bóc tách nội dung tệp .doc, poppler cho PDF
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-writer-nogui fonts-liberation ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
RUN mkdir -p /data/uploads
VOLUME ["/data"]
EXPOSE 5000
CMD ["node", "dist/index.cjs"]
