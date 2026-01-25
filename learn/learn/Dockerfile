# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/web

# Copy package files first for better caching
COPY web/package*.json ./

# Install dependencies
RUN npm ci --silent

# Copy frontend source
COPY web/ ./

# Build frontend
RUN npm run build

# ============================================
# Stage 2: Build Go Backend
# ============================================
FROM golang:1.24-alpine AS backend-builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY cmd/ ./cmd/
COPY internal/ ./internal/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/cmd/liveclass/dist ./cmd/liveclass/dist

# Build the binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.version=docker" \
    -o /liveclass \
    ./cmd/liveclass

# ============================================
# Stage 3: Final Production Image
# ============================================
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user for security
RUN addgroup -g 1001 -S liveclass && \
    adduser -u 1001 -S liveclass -G liveclass

WORKDIR /app

# Copy binary from builder
COPY --from=backend-builder /liveclass .

# Copy frontend dist
COPY --from=backend-builder /app/cmd/liveclass/dist ./cmd/liveclass/dist

# Create storage directories
RUN mkdir -p /app/storage/recordings /app/storage/notes && \
    chown -R liveclass:liveclass /app

# Switch to non-root user
USER liveclass

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Run the application
ENTRYPOINT ["./liveclass"]

