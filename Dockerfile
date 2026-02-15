# ---------- build stage ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# install node deps
COPY package*.json ./
RUN npm ci

# copy source and build next
COPY . .
RUN npm run build


# ---------- runtime stage ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# install python3 + pip
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip \
 && rm -rf /var/lib/apt/lists/*

# copy node runtime artifacts
COPY --from=builder /app ./

# install python deps (if any)
# (safe even if requirements.txt is empty / minimal)
RUN if [ -f requirements.txt ]; then pip3 install --no-cache-dir -r requirements.txt; fi

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# IMPORTANT: use Next.js start (needs "next start")
CMD ["npm", "start"]
