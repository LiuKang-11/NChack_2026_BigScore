# ---------- build stage ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# ---------- runtime stage ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# install python + venv
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
 && rm -rf /var/lib/apt/lists/*

# Create virtualenv + make it default
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# copy built app + source
COPY --from=builder /app ./

# install python deps into venv (only if requirements.txt exists)
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm","start"]
