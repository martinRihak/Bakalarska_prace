#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
DATA_DIR="${PROJECT_DIR}/data"

BACKEND_IMAGE="iot-backend:local"
FRONTEND_IMAGE="iot-frontend:local"
BACKEND_CONTAINER="iot-backend"
FRONTEND_CONTAINER="iot-frontend"

MODBUS_PORT="${MODBUS_PORT:-${USB_PORT:-/dev/ttyUSB0}}"
if [[ ! -e "$MODBUS_PORT" && -e /dev/ttyUSB1 ]]; then
    MODBUS_PORT="/dev/ttyUSB1"
fi

SECRET_KEY_VALUE="${SECRET_KEY:-}"
if [[ -z "$SECRET_KEY_VALUE" ]]; then
    SECRET_KEY_VALUE="$(openssl rand -hex 32 2>/dev/null || python3 -c 'import secrets; print(secrets.token_hex(32))')"
fi

echo ""
echo "============================================="
echo "  IoT Monitorovací Systém - Docker build"
echo "============================================="
echo ""

if ! command -v docker >/dev/null 2>&1; then
    log_error "Docker is not installed. Install Docker and run this script again."
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    log_error "Docker is installed, but the Docker daemon is not available."
    exit 1
fi

if [[ ! -f "${PROJECT_DIR}/backend/Dockerfile" ]]; then
    log_error "Missing ${PROJECT_DIR}/backend/Dockerfile"
    exit 1
fi

if [[ ! -f "${PROJECT_DIR}/frontend/Dockerfile" ]]; then
    log_error "Missing ${PROJECT_DIR}/frontend/Dockerfile"
    exit 1
fi

mkdir -p "$DATA_DIR"

log_info "Docker found: $(docker --version)"
log_info "Building backend image from backend/Dockerfile..."
docker build -t "$BACKEND_IMAGE" -f "${PROJECT_DIR}/backend/Dockerfile" "${PROJECT_DIR}/backend"

log_info "Building frontend image from frontend/Dockerfile..."
docker build -t "$FRONTEND_IMAGE" -f "${PROJECT_DIR}/frontend/Dockerfile" "${PROJECT_DIR}/frontend"

DEVICE_BLOCK=""
if [[ -e "$MODBUS_PORT" ]]; then
    DEVICE_BLOCK=$(cat <<EOF
    devices:
      - "${MODBUS_PORT}:${MODBUS_PORT}"
EOF
)
else
    log_warn "Modbus device ${MODBUS_PORT} was not found. docker-compose.yml will be created without device mapping."
fi

log_info "Creating ${COMPOSE_FILE}..."
cat > "$COMPOSE_FILE" <<EOF
services:
  backend:
    image: ${BACKEND_IMAGE}
    container_name: ${BACKEND_CONTAINER}
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/instance${DEVICE_BLOCK:+$DEVICE_BLOCK}    
    environment:
      APP_ENV: "production"
      SECRET_KEY: "${SECRET_KEY_VALUE}"
      USB_PORT: "${MODBUS_PORT}"
      MODBUS_PORT: "${MODBUS_PORT}"
      DB: "sqlite:////app/instance/app.db"
      FLASK_HOST: "0.0.0.0"
      FLASK_PORT: "5000"
      FLASK_DEBUG: "false"
      CORS_ORIGINS: "http://raspberrypi.local:5173,http://localhost:5173"
      COOKIE_SECURE: "false"
      COOKIE_SAMESITE: "Lax"
      COOKIE_DOMAIN: ""
    devices:
      - ${MODBUS_PORT}:${MODBUS_PORT}
    restart: unless-stopped

  frontend:
    image: ${FRONTEND_IMAGE}
    container_name: ${FRONTEND_CONTAINER}
    ports:
      - "5173:5173"
    depends_on:
      - backend
    restart: unless-stopped
EOF

echo ""
log_info "Done."
log_info "Compose file: ${COMPOSE_FILE}"
log_info "Start containers with: docker compose up -d"
