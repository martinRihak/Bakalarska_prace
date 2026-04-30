#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
DB_FILE="${1:-${SCRIPT_DIR}/data/app.db}"
DEFAULT_DB_FILE="${SCRIPT_DIR}/data/app.db"
CONTAINER_DB_FILE="/app/instance/app.db"
ADMIN_USERNAME="admin"
ADMIN_EMAIL="admin@admin.cz"
ADMIN_PASSWORD_HASH='pbkdf2:sha256:1000000$admin-install-salt$141e4c892b456d812fa1ff3062aa2373ec8be53320290e7ddc62bf8af95255c7'

if [[ ! -f "$DB_FILE" ]]; then
    echo "Database not found: $DB_FILE"
    echo "Run install.sh from this directory and start backend at least once so it creates data/app.db."
    exit 1
fi

create_admin_with_sqlite() {
    sqlite3 "$DB_FILE" <<SQL
INSERT INTO users (username, email, password_hash, role)
VALUES (
    '${ADMIN_USERNAME}',
    '${ADMIN_EMAIL}',
    '${ADMIN_PASSWORD_HASH}',
    'admin'
)
ON CONFLICT(username) DO UPDATE SET
    email = excluded.email,
    password_hash = excluded.password_hash,
    role = excluded.role;
SQL
}

create_admin_with_docker() {
    docker compose exec -T backend python - <<'PY'
import sqlite3

db_file = "/app/instance/app.db"
conn = sqlite3.connect(db_file)
try:
    conn.execute(
        """
INSERT INTO users (username, email, password_hash, role)
VALUES (
    'admin',
    'admin@admin.cz',
    'pbkdf2:sha256:1000000$admin-install-salt$141e4c892b456d812fa1ff3062aa2373ec8be53320290e7ddc62bf8af95255c7',
    'admin'
)
ON CONFLICT(username) DO UPDATE SET
    email = excluded.email,
    password_hash = excluded.password_hash,
    role = excluded.role;
"""
    )
    conn.commit()
finally:
    conn.close()
PY
}

if [[ -w "$DB_FILE" && -w "$(dirname "$DB_FILE")" ]]; then
    if ! command -v sqlite3 >/dev/null 2>&1; then
        echo "sqlite3 is required to edit writable host databases. Install it first."
        exit 1
    fi
    create_admin_with_sqlite
elif [[ "$DB_FILE" == "$DEFAULT_DB_FILE" ]] && command -v docker >/dev/null 2>&1; then
    echo "Database is not writable from host: $DB_FILE"
    echo "Trying to write through the backend container at ${CONTAINER_DB_FILE}..."
    if ! create_admin_with_docker; then
        echo "Could not write through Docker. Make sure the backend container is running."
        echo "Or fix host permissions with: sudo chown -R $(id -u):$(id -g) \"${SCRIPT_DIR}/data\""
        exit 1
    fi
else
    echo "Database is not writable: $DB_FILE"
    echo "Fix permissions, for example: sudo chown -R $(id -u):$(id -g) \"${SCRIPT_DIR}/data\""
    exit 1
fi

echo "Admin created: username=admin password=admin email=admin@admin.cz"
