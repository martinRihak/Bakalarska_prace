import logging
import os
import secrets
import sys
from pathlib import Path

from dotenv import dotenv_values
from flask import Flask, render_template
from flask_cors import CORS

from models.models import init_db
from routes import init_routes
from utils.auth_utils import login_required
from utils.modbusManagerNew import ModbusManager


def _normalize_app_env(value):
    normalized = (value or "").strip().lower()
    return "production" if normalized == "production" else "development"


def _bootstrap_environment():
    project_root = Path(__file__).resolve().parent
    base_env_path = project_root / ".env"
    base_values = dotenv_values(base_env_path) if base_env_path.exists() else {}

    requested_env = (
        os.environ.get("APP_ENV")
        or os.environ.get("FLASK_ENV")
        or os.environ.get("ENV")
        or base_values.get("APP_ENV")
        or base_values.get("FLASK_ENV")
        or base_values.get("ENV")
        or "development"
    )
    app_env = _normalize_app_env(requested_env)

    env_files = [
        project_root / ".env",
        project_root / f".env.{app_env}",
        project_root / ".env.local",
        project_root / f".env.{app_env}.local",
    ]

    merged_values = {}
    loaded_files = []
    for env_file in env_files:
        if env_file.exists():
            merged_values.update(
                {key: value for key, value in dotenv_values(env_file).items() if value is not None}
            )
            loaded_files.append(env_file.name)

    # Shell-provided variables keep the highest priority.
    for key, value in merged_values.items():
        os.environ.setdefault(key, value)

    os.environ["APP_ENV"] = app_env
    return app_env, loaded_files


APP_ENV, LOADED_ENV_FILES = _bootstrap_environment()


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

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.DEBUG)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(console_handler)
    root_logger.setLevel(logging.DEBUG)

    app_logger = logging.getLogger("flask.app")
    app_logger.handlers.clear()
    app_logger.addHandler(console_handler)
    app_logger.setLevel(logging.DEBUG)

    return app_logger


app = Flask(__name__)

is_production = APP_ENV == "production"
cors_origins = _get_env_list("CORS_ORIGINS", ["http://localhost:5173"])

app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or secrets.token_hex(16)
app.config["JWT_SECRET"] = os.environ.get("JWT_SECRET") or app.config["SECRET_KEY"]
app.config["COOKIE_SECURE"] = _get_env_bool("COOKIE_SECURE", default=is_production)
app.config["COOKIE_SAMESITE"] = os.environ.get("COOKIE_SAMESITE") or "Strict"
app.config["COOKIE_DOMAIN"] = os.environ.get("COOKIE_DOMAIN") or None
app.config["CORS_ORIGINS"] = cors_origins

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
if LOADED_ENV_FILES:
    logger.info(f"APP_ENV={APP_ENV}; loaded env files: {', '.join(LOADED_ENV_FILES)}")
else:
    logger.warning("No .env files found; relying on shell environment variables only")
if not os.environ.get("JWT_SECRET"):
    logger.warning("JWT_SECRET is not set; falling back to SECRET_KEY")
init_db(app)

with app.app_context():
    try:
        modbus_manager = ModbusManager(app=app)
        app.config["MODBUS_MANAGER"] = modbus_manager
        logger.info("ModbusManager successfully initialized")
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
    
