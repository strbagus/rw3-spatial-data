# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build Nuxt production output
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

# Install FFmpeg (required for on-demand CCTV RTSP streaming) and timezone data
RUN apk add --no-cache ffmpeg tzdata

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Copy compiled standalone output from builder stage
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
