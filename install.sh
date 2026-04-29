#!/usr/bin/env bash
# =============================================================================
# install.sh - Automatizovaný instalační skript pro IoT monitorovací systém
# Stahuje Docker obrazy z Docker Hubu – nevyžaduje zdrojový kód.
# Použití: chmod +x install.sh && ./install.sh
# =============================================================================
set -euo pipefail

# ---- Docker Hub obrazy (VYPLŇ PŘED POUŽITÍM) --------------------------------
BACKEND_IMAGE="<dockerhub-user>/iot-backend:latest"
FRONTEND_IMAGE="<dockerhub-user>/iot-frontend:latest"
# ------------------------------------------------------------------------------

# Barvy
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "============================================="
echo "  IoT Monitorovací Systém - Instalace"
echo "============================================="
echo ""

# ---------------------------------------------------------------------------
# 1. Kontrola Docker
# ---------------------------------------------------------------------------
if ! command -v docker &> /dev/null; then
    log_warn "Docker není nainstalován."
    read -rp "Chcete nainstalovat Docker automaticky? [y/N]: " ans
    if [[ "$ans" =~ ^[Yy]$ ]]; then
        log_info "Instaluji Docker..."
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker "$USER"
        log_warn "Odhlaste se a znovu přihlaste, poté spusťte skript znovu."
        exit 0
    else
        log_error "Docker je vyžadován. Ukončuji."
        exit 1
    fi
fi

if ! docker compose version &> /dev/null; then
    log_error "Docker Compose není dostupný. Nainstalujte Docker Compose plugin."
    exit 1
fi

log_info "Docker $(docker --version | awk '{print $3}') nalezen."

# ---------------------------------------------------------------------------
# 2. Detekce prostředí (Raspberry Pi vs. PC)
# ---------------------------------------------------------------------------
IS_RPI=false
MODBUS_PORT="/dev/ttyUSB0"

if [[ -f /proc/device-tree/model ]] && grep -qi "raspberry" /proc/device-tree/model 2>/dev/null; then
    IS_RPI=true
    log_info "Detekováno: Raspberry Pi"
    if [[ -e /dev/ttyUSB0 ]]; then
        log_info "Převodník USB-RS485 nalezen na /dev/ttyUSB0"
    elif [[ -e /dev/ttyUSB1 ]]; then
        MODBUS_PORT="/dev/ttyUSB1"
        log_info "Převodník USB-RS485 nalezen na /dev/ttyUSB1"
    else
        log_warn "Převodník USB-RS485 nebyl detekován."
    fi
else
    log_info "Detekováno: Běžný počítač (vývojový režim)"
fi

# ---------------------------------------------------------------------------
# 3. Pracovní adresář
# ---------------------------------------------------------------------------
INSTALL_DIR="$HOME/iot-monitor"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
log_info "Pracovní adresář: $INSTALL_DIR"

# ---------------------------------------------------------------------------
# 4. Generování konfigurace
# ---------------------------------------------------------------------------
mkdir -p data

if [[ ! -f ".env" ]]; then
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
    cat > .env << EOF
# Automaticky vygenerováno skriptem install.sh
APP_ENV=production
JWT_SECRET_KEY=${JWT_SECRET}
MODBUS_PORT=${MODBUS_PORT}
SQLALCHEMY_DATABASE_URI=sqlite:///instance/app.db
CORS_ORIGINS=http://localhost:5173
EOF
    log_info "Vytvořen konfigurační soubor .env"
else
    log_warn "Soubor .env již existuje, přeskakuji."
fi

# ---------------------------------------------------------------------------
# 5. Generování docker-compose.yml
# ---------------------------------------------------------------------------
if $IS_RPI; then
    # Varianta s mapováním USB zařízení
    cat > docker-compose.yml << EOF
services:
  backend:
    image: ${BACKEND_IMAGE}
    container_name: iot-backend
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/instance
    devices:
      - ${MODBUS_PORT}:${MODBUS_PORT}
    env_file: .env
    restart: unless-stopped

  frontend:
    image: ${FRONTEND_IMAGE}
    container_name: iot-frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    restart: unless-stopped
EOF
else
    # Varianta bez fyzických senzorů
    cat > docker-compose.yml << EOF
services:
  backend:
    image: ${BACKEND_IMAGE}
    container_name: iot-backend
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/instance
    env_file: .env
    restart: unless-stopped

  frontend:
    image: ${FRONTEND_IMAGE}
    container_name: iot-frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    restart: unless-stopped
EOF
fi

log_info "Vytvořen soubor docker-compose.yml"

# ---------------------------------------------------------------------------
# 6. Stažení obrazů a spuštění
# ---------------------------------------------------------------------------
log_info "Stahuji Docker obrazy z Docker Hubu..."
docker compose pull

log_info "Spouštím kontejnery..."
docker compose up -d

echo ""
echo "============================================="
echo "  Instalace úspěšně dokončena!"
echo "============================================="
echo ""

IP_ADDR=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "<ip-adresa>")

log_info "Frontend:    http://${IP_ADDR}:5173"
log_info "Backend API: http://${IP_ADDR}:5000"
log_info "Data:        ${INSTALL_DIR}/data/"
echo ""
log_info "Stav kontejnerů: docker compose ps"
log_info "Zobrazit logy:   docker compose logs -f"
log_info "Zastavit:        docker compose down"
log_info "Aktualizovat:    docker compose pull && docker compose up -d"
echo ""