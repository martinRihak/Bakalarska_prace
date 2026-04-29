import logging
import os
import secrets
import sys

from dotenv import load_dotenv
from flask import Flask, render_template
from flask_cors import CORS

from models.models import init_db
from routes import init_routes
from utils.auth_utils import login_required
from utils.modbus_manager import ModbusManager

load_dotenv()

APP_ENV = "production" if os.environ.get("APP_ENV", "").strip().lower() == "production" else "development"
is_production = APP_ENV == "production"


def _get_env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_env_list(name, default):
    value = os.environ.get(name)
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


def setup_logger():
    formatter = logging.Formatter(
        "\033[92m%(asctime)s\033[0m - \033[94m%(name)s\033[0m - \033[93m%(levelname)s\033[0m - %(message)s"
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.setLevel(logging.DEBUG)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.DEBUG)

    return root


logger = setup_logger()

app = Flask(__name__)

cors_origins = _get_env_list("CORS_ORIGINS", ["http://localhost:5173"])

app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
app.config["COOKIE_SECURE"] = _get_env_bool("COOKIE_SECURE", default=is_production)
app.config["COOKIE_SAMESITE"] = os.environ.get("COOKIE_SAMESITE", "Strict")
app.config["COOKIE_DOMAIN"] = os.environ.get("COOKIE_DOMAIN")
app.config["CORS_ORIGINS"] = cors_origins

if not os.environ.get("SECRET_KEY"):
    logger.warning("SECRET_KEY not set; generating a random one")

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": cors_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            "allow_headers": ["Content-Type", "Authorization", "Accept"],
            "supports_credentials": True,
            "expose_headers": ["Content-Range", "X-Content-Range"],
        },
        r"/*": {
            "origins": cors_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            "allow_headers": ["Content-Type", "Authorization", "Accept"],
            "supports_credentials": True,
            "expose_headers": ["Content-Range", "X-Content-Range"],
        },
    },
    supports_credentials=True,
)
logger = setup_logger()

if not os.environ.get("JWT_SECRET"):
    logger.warning("JWT_SECRET is not set.")
if os.environ.get("COOKIE_DOMAIN") and app.config["COOKIE_DOMAIN"] is None:
    logger.warning(
        "COOKIE_DOMAIN resolved to host-only cookie (likely localhost or invalid URL input)"
    )
init_db(app)

with app.app_context():
    try:
        modbus_manager = ModbusManager(app=app)
        app.config["MODBUS_MANAGER"] = modbus_manager
        logger.info("ModbusManager initialized")
    except Exception as e:
        logger.error(f"Failed to initialize ModbusManager: {e}")
        sys.exit(1)

init_routes(app)


@app.route("/")
@login_required
def index():
    return render_template("index.html")


if __name__ == "__main__":
    debug = _get_env_bool("FLASK_DEBUG", default=not is_production)
    host = os.environ.get("FLASK_HOST", "0.0.0.0")
    port = int(os.environ.get("FLASK_PORT", "5000"))
    app.run(host=host, port=port, debug=debug, use_reloader=False)
