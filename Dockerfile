# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build Nuxt production output (SSR node-server preset)
ENV NITRO_PRESET=node-server
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

# Install FFmpeg (required for on-demand CCTV RTSP streaming) and timezone data
RUN apk add --no-cache ffmpeg tzdata

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    NITRO_PORT=3000 \
    NITRO_HOST=0.0.0.0

# Copy compiled standalone SSR output from builder stage
COPY --from=builder /app/.output ./.output

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/peta/json/layers.json >/dev/null 2>&1 || exit 1

CMD ["node", ".output/server/index.mjs"]
