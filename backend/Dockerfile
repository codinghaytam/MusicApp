# Stage 1: Builder - full Ubuntu with build toolchain to compile whisper-node
FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 20.x and build tools
RUN apt-get update \
    && apt-get install -y curl ca-certificates gnupg build-essential python3 ffmpeg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Install dependencies (including dev deps to allow native builds like whisper-node)
COPY package*.json ./
RUN npm install

# Download whisper model in the image so it doesn't download at runtime
RUN npx whisper-node download --model small

# Copy source and build (if needed) so native modules finish compiling
COPY . .

# Optionally build if your backend has a build step (uncomment if needed)
# RUN npm run build


# Stage 2: Runtime - minimal image with Node and ffmpeg only
FROM node:20-slim AS runtime

# Install ffmpeg runtime dependency for whisper-node
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy only the built app and node_modules from the builder image
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app .

EXPOSE 3000

CMD ["npm", "start"]
