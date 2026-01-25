#!/bin/bash
# LiveClass - Build and Run Script
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$PROJECT_ROOT/web"
CMD_DIR="$PROJECT_ROOT/cmd/liveclass"
BINARY="liveclass"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}==>${NC} $1"; }

show_help() {
    echo "Usage: ./run.sh [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  (default)    Build and run on :8080"
    echo "  multi        Run 2 instances with Redis (:8080 + :8081)"
    echo "  docker       Run with Docker Compose"
    echo "  stop         Stop all instances"
    echo ""
    echo "Options:"
    echo "  -f           Build frontend first"
    echo "  -b           Build only, don't run"
    echo "  -h           Show help"
    echo ""
    echo "Examples:"
    echo "  ./run.sh              # Run single instance"
    echo "  ./run.sh -f           # Build frontend + run"
    echo "  ./run.sh multi        # Run 2 instances with Redis"
    echo "  ./run.sh stop         # Stop all"
}

BUILD_FRONTEND=false
BUILD_ONLY=false
COMMAND=""

[[ $# -gt 0 && ! "$1" =~ ^- ]] && { COMMAND=$1; shift; }

while [[ $# -gt 0 ]]; do
    case $1 in
        -f) BUILD_FRONTEND=true; shift ;;
        -b) BUILD_ONLY=true; shift ;;
        -h) show_help; exit 0 ;;
        *) echo "Unknown: $1"; show_help; exit 1 ;;
    esac
done

stop_all() {
    log "Stopping instances..."
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true
    docker stop liveclass-redis-test 2>/dev/null || true
    docker rm liveclass-redis-test 2>/dev/null || true
}

start_redis() {
    log "Starting Redis..."
    docker run -d --name liveclass-redis-test -p 6379:6379 redis:7-alpine >/dev/null
    sleep 2
}

build_frontend() {
    log "Building frontend..."
    cd "$WEB_DIR"
    [ ! -d "node_modules" ] && npm install
    npm run build
    cd "$PROJECT_ROOT"
}

build_backend() {
    [ ! -d "$CMD_DIR/dist" ] && build_frontend
    log "Building backend..."
    go build -o "$PROJECT_ROOT/$BINARY" "$CMD_DIR"
}

case $COMMAND in
    multi)
        stop_all
        [ "$BUILD_FRONTEND" = true ] && build_frontend
        build_backend
        start_redis
        log "Starting Server 1 (:8080)..."
        REDIS_ENABLED=true INSTANCE_ID=server-1 PORT=8080 ./$BINARY &
        sleep 2
        log "Starting Server 2 (:8081)..."
        REDIS_ENABLED=true INSTANCE_ID=server-2 PORT=8081 ./$BINARY &
        echo ""
        echo -e "${GREEN}✅ Running!${NC}"
        echo -e "Server 1: ${CYAN}http://localhost:8080${NC}"
        echo -e "Server 2: ${CYAN}http://localhost:8081${NC}"
        echo -e "Login: ${YELLOW}admin@liveclass.com / admin123${NC}"
        wait
        ;;
    docker)
        log "Starting Docker..."
        docker compose up -d
        echo -e "${GREEN}✅ Running:${NC} ${CYAN}http://localhost:8080${NC}"
        ;;
    stop)
        stop_all
        docker compose down 2>/dev/null || true
        log "Stopped"
        ;;
    *)
        [ "$BUILD_FRONTEND" = true ] && build_frontend
        build_backend
        [ "$BUILD_ONLY" = false ] && { log "Starting on :8080..."; ./$BINARY; }
        ;;
esac
