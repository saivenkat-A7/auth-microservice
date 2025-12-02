# =============================
# Stage 1 – Builder
# =============================
FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# =============================
# Stage 2 – Runtime
# =============================
FROM node:18-slim

ENV TZ=UTC

WORKDIR /app

RUN apt-get update && \
    apt-get install -y cron tzdata && \
    rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/share/zoneinfo/UTC /etc/localtime \
    && echo "UTC" > /etc/timezone

COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Install cron configuration
COPY cronjob/2fa-cron /etc/cron.d/2fa-cron
RUN chmod 0644 /etc/cron.d/2fa-cron
RUN crontab /etc/cron.d/2fa-cron

RUN mkdir -p /data && mkdir -p /cron
RUN chmod -R 755 /data /cron

EXPOSE 8080

CMD ["sh", "-c", "cron && node server.js"]
